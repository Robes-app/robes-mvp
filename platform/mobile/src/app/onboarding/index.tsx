import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { firstRun as copy, onboarding, ui } from '@robes/copy';
import { onboardingBrands, type StyleType } from '@robes/core/style-dna';
import { Button, ErrorText, Field, PrimaryScope, Wordmark } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';
import {
  BrandsStep,
  type Colours,
  ColoursStep,
  type Identity,
  IdentityStep,
  StylesStep,
} from '@/features/onboarding/Steps';
import { nativeAnalytics } from '@/lib/analytics';

type Step = 1 | 2 | 3 | 4 | 5;
const STEP_NAMES = { 1: 'name', 2: 'identity', 3: 'styles', 4: 'brands', 5: 'colours' } as const;
const SPLASH_MS = 2_000;

const toggle = <T,>(list: readonly T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

// Splash → name → identity → styles → brands → colours → Home (handoff 30 Oct; twin:
// app/src/app/onboarding/onboarding-form.tsx). One screen holds every answer, so Back (and the
// Android back button) never loses one. Her name saves on its own step; the rest on Get started.
export default function Onboarding() {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const me = useApi('me.get');
  const [step, setStep] = useState<Step | 'splash'>('splash');
  const [firstName, setFirstName] = useState('');
  const [touched, setTouched] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [styles, setStyles] = useState<StyleType[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [colours, setColours] = useState<Colours>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = touched ? firstName : firstName || me.data?.firstName || '';

  // Her houses lead; one she picked stays on the wall when her styles change.
  const wall = useMemo(() => {
    const seeded = onboardingBrands(styles, identity);
    return [...seeded, ...brands.filter((b) => !seeded.includes(b))];
  }, [styles, identity, brands]);

  useEffect(() => {
    if (step !== 'splash') return;
    const t = setTimeout(() => setStep(1), SPLASH_MS);
    return () => clearTimeout(t);
  }, [step]);
  useEffect(() => {
    if (step !== 'splash')
      nativeAnalytics.track('onboarding_step', { step: STEP_NAMES[step], outcome: 'shown' });
  }, [step]);
  useEffect(() => {
    if (step === 'splash' || step === 1) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setError(null);
      setStep((step - 1) as Step);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const answered = (s: Step, skipped = false) =>
    nativeAnalytics.track('onboarding_step', {
      step: STEP_NAMES[s],
      outcome: skipped ? 'skipped' : 'answered',
    });
  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };

  async function saveName() {
    const first = name.trim().split(/\s+/)[0];
    if (!first) return;
    setBusy(true);
    setError(null);
    try {
      if (first !== me.data?.firstName) {
        await api.call('me.update', { input: { firstName: first } });
        await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      }
      answered(1);
      setStep(2);
    } catch {
      setError(onboarding.failed);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await api.call('me.onboarding.complete', {
        input: { ...(identity ? { identity } : {}), styles, brands, colours },
      });
      // No /me observer is mounted on the tabs gate yet; the cache must already say onboarded.
      queryClient.setQueryData<Me>(queryKeys.call('me.get'), (old) =>
        old ? { ...old, onboarded: true } : old,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      answered(5, Object.keys(colours).length === 0);
      nativeAnalytics.track('onboarding_answered', {
        styles: styles.length,
        brands: brands.length,
        colours: Object.keys(colours).length,
      });
      router.replace('/');
    } catch {
      setError(onboarding.failed);
      setBusy(false);
    }
  }

  if (step === 'splash') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ui.wordmark}
        onPress={() => setStep(1)}
        className="flex-1 items-center justify-center bg-ink"
        testID="splash"
      >
        <Wordmark size="hero" className="text-bg" />
      </Pressable>
    );
  }

  const back = step > 1 ? () => go((step - 1) as Step) : undefined;
  const footer = (label: string, onPress: () => void, disabled = false): ReactNode => (
    <>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        variant="primary"
        onPress={onPress}
        disabled={disabled}
        loading={busy}
        loadingLabel={onboarding.saving}
      >
        {label}
      </Button>
    </>
  );

  const screens: Record<
    Step,
    { title: string; titleEm: string; footer: ReactNode; body: ReactNode }
  > = {
    1: {
      ...copy.name,
      footer: footer(copy.continue, saveName, name.trim().length === 0),
      body: (
        <Field
          variant="underline"
          autoFocus
          label={copy.name.label}
          placeholder={copy.name.placeholder}
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={60}
          value={name}
          onChangeText={(v) => {
            setTouched(true);
            setFirstName(v);
          }}
          onSubmitEditing={saveName}
        />
      ),
    },
    2: {
      ...copy.identity,
      footer: footer(
        copy.continue,
        () => {
          answered(2);
          go(3);
        },
        !identity,
      ),
      body: <IdentityStep value={identity} onChange={setIdentity} />,
    },
    3: {
      ...copy.styles,
      footer: footer(copy.continue, () => {
        answered(3, styles.length === 0);
        go(4);
      }),
      body: (
        <StylesStep
          identity={identity}
          value={styles}
          onToggle={(t) => setStyles((s) => toggle(s, t))}
        />
      ),
    },
    4: {
      ...copy.brands,
      footer: footer(copy.continue, () => {
        answered(4, brands.length === 0);
        go(5);
      }),
      body: (
        <BrandsStep wall={wall} value={brands} onToggle={(b) => setBrands((s) => toggle(s, b))} />
      ),
    },
    5: {
      ...copy.colours,
      footer: footer(copy.finish, finish),
      body: (
        <ColoursStep
          value={colours}
          onChange={(family, v) =>
            setColours((c) => {
              const { [family]: _, ...rest } = c;
              return v === 0 ? rest : { ...rest, [family]: v };
            })
          }
        />
      ),
    },
  };
  const s = screens[step];

  return (
    <PrimaryScope>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-bg"
      >
        <FirstRunFrame
          step={step}
          title={s.title}
          titleEm={s.titleEm}
          onBack={back}
          footer={s.footer}
        >
          {s.body}
        </FirstRunFrame>
      </KeyboardAvoidingView>
    </PrimaryScope>
  );
}
