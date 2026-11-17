import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import {
  FIRST_RUN_CAPTURES,
  FIRST_RUN_STEPS,
  FIRST_RUN_VERSION,
  type FirstRunCapture,
  type FirstRunStep,
  type Me,
} from '@robes/contracts';
import { firstRun as copy, onboarding, ui } from '@robes/copy';
import { onboardingBrands, STYLE_TYPES, type StyleType } from '@robes/core/style-dna';
import { Button, ErrorText, Field, PrimaryScope, Wordmark } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';
import { CaptureStep } from '@/features/onboarding/CaptureStep';
import { OutfitStep } from '@/features/onboarding/OutfitStep';
import {
  BrandsStep,
  IDENTITIES,
  type Identity,
  IdentityStep,
  StylesStep,
} from '@/features/onboarding/Steps';
import { TwinStep } from '@/features/onboarding/TwinStep';
import { READ_PARAM } from '@/features/you/use-selfie';
import { nativeAnalytics } from '@/lib/analytics';
import { readPref, writePref } from '@/lib/prefs';

const SPLASH_MS = 2_000;
const isCapture = (s: FirstRunStep): s is FirstRunCapture =>
  (FIRST_RUN_CAPTURES as readonly string[]).includes(s);
const after = (s: FirstRunStep): FirstRunStep | null =>
  FIRST_RUN_STEPS[FIRST_RUN_STEPS.indexOf(s) + 1] ?? null;
const before = (s: FirstRunStep): FirstRunStep | null =>
  FIRST_RUN_STEPS[FIRST_RUN_STEPS.indexOf(s) - 1] ?? null;

// Her answers so far, kept on the phone as she goes (audit F7): closing the app mid-way brings
// her back to the step she was on, never to step 1. Per account; cleared once she finishes. Past
// Brands her answers are on her profile and her step on the server (R-S3), so any phone resumes.
interface Draft {
  step: FirstRunStep;
  identity: Identity | null;
  styles: StyleType[];
  brands: string[];
}
const draftKey = (userId: string) => `robes.onboarding.${userId}`;

const toggle = <T,>(list: readonly T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

// Getting to know you, eight steps (onboarding PRD, 17 Nov; design "Robes onboarding — prototype";
// the first four as live since the handoff of 30 Oct): Splash → name → identity → styles → brands
// → saved looks → pieces you love → digital twin → today's outfit → Home. Her answers save on
// Brands without onboarding her; each capture step is skippable; she is onboarded as she leaves
// for Home. An account onboarded before walks it once, its answers prefilled.
// shortcut: native first (Annie, 17 Nov); the web twin, app/src/app/onboarding/onboarding-form.tsx,
// still runs the five-step flow until it follows.
export default function Onboarding() {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ [READ_PARAM]?: string }>();
  const me = useApi('me.get');
  const [step, setStep] = useState<FirstRunStep | 'splash'>('splash');
  const [firstName, setFirstName] = useState('');
  const [touched, setTouched] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [styles, setStyles] = useState<StyleType[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<FirstRunCapture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = touched ? firstName : firstName || me.data?.firstName || '';
  const userId = me.data?.id;
  // Past Brands, or a re-run: her answers as her profile holds them.
  const answered = me.data ? me.data.onboarded || me.data.firstRun.step !== null : false;
  const dna = useApi('me.dna.get', undefined, { enabled: answered });

  // Back where she left off (audit F7, R-S3), decided once we know whose it is: the close-up
  // coming back to the twin step, else her step on the server, else this phone's draft.
  const restored = useRef(false);
  useEffect(() => {
    if (!userId || !me.data || restored.current) return;
    if (answered && !dna.data && !dna.isError) return;
    restored.current = true;
    const server = me.data.firstRun;
    setSkipped(server.skipped);
    if (dna.data) {
      const g = dna.data.gender;
      setIdentity((IDENTITIES as readonly string[]).includes(g) ? (g as Identity) : null);
      setStyles(dna.data.types.filter((t): t is StyleType => STYLE_TYPES.includes(t as StyleType)));
      setBrands(dna.data.brands);
    }
    if (params[READ_PARAM]) {
      setStep('twin');
      return;
    }
    if (server.step && isCapture(server.step)) {
      setStep(server.step);
      return;
    }
    void readPref(draftKey(userId)).then((raw) => {
      if (!raw) return;
      try {
        const d = JSON.parse(raw) as Draft;
        setIdentity(d.identity ?? null);
        setStyles(d.styles ?? []);
        setBrands(d.brands ?? []);
        if (FIRST_RUN_STEPS.includes(d.step) && d.step !== 'name') setStep(d.step);
      } catch {
        // A draft that doesn't read starts her afresh.
      }
    });
  }, [userId, me.data, answered, dna.data, dna.isError, params]);

  // Each answer is kept on the phone as she gives it, and her step on the server.
  useEffect(() => {
    if (!userId || !restored.current || step === 'splash') return;
    if (!isCapture(step)) {
      const draft: Draft = { step, identity, styles, brands };
      void writePref(draftKey(userId), JSON.stringify(draft));
    }
  }, [userId, step, identity, styles, brands]);
  useEffect(() => {
    if (!restored.current || step === 'splash') return;
    void api.call('me.onboarding.save', { input: { step, skipped } }).catch(() => {});
  }, [api, step, skipped]);

  // Her houses lead; one she picked stays on the wall when her styles change.
  const wall = useMemo(() => {
    const seeded = onboardingBrands(styles, identity);
    return [...seeded, ...brands.filter((b) => !seeded.includes(b))];
  }, [styles, identity, brands]);

  useEffect(() => {
    if (step !== 'splash') return;
    const t = setTimeout(() => setStep('name'), SPLASH_MS);
    return () => clearTimeout(t);
  }, [step]);
  useEffect(() => {
    if (step !== 'splash') nativeAnalytics.track('onboarding_step', { step, outcome: 'shown' });
  }, [step]);
  useEffect(() => {
    if (step === 'splash') return;
    const back = before(step);
    if (!back) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setError(null);
      setStep(back);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const track = (s: FirstRunStep, outcome: 'answered' | 'skipped') =>
    nativeAnalytics.track('onboarding_step', { step: s, outcome });
  const go = (s: FirstRunStep | null) => {
    setError(null);
    if (s) setStep(s);
  };
  const skip = (s: FirstRunCapture) => {
    track(s, 'skipped');
    setSkipped((all) => (all.includes(s) ? all : [...all, s]));
    go(after(s));
  };
  const done = (s: FirstRunCapture) => {
    track(s, 'answered');
    setSkipped((all) => all.filter((x) => x !== s));
    go(after(s));
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
      track('name', 'answered');
      go('identity');
    } catch {
      setError(onboarding.failed);
    } finally {
      setBusy(false);
    }
  }

  // Brands' Continue saves 01–04 (R-4.2), so her answers are safe if she leaves; she is not
  // onboarded until she goes on to Home.
  async function saveAnswers() {
    setBusy(true);
    setError(null);
    try {
      await api.call('me.onboarding.save', {
        input: { ...(identity ? { identity } : {}), styles, brands, step: 'looks' },
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.dna.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
      track('brands', brands.length === 0 ? 'skipped' : 'answered');
      nativeAnalytics.track('onboarding_answered', {
        styles: styles.length,
        brands: brands.length,
        colours: 0,
      });
      go('looks');
    } catch {
      setError(onboarding.failed);
    } finally {
      setBusy(false);
    }
  }

  // Onboarded as she leaves for Home (or for Home's Capture, which ends there).
  async function finish(to: Href) {
    setBusy(true);
    setError(null);
    try {
      await api.call('me.onboarding.complete', { input: { firstRun: FIRST_RUN_VERSION } });
      // No /me observer is mounted on the tabs gate yet; the cache must already say she is done.
      queryClient.setQueryData<Me>(queryKeys.call('me.get'), (old) =>
        old
          ? {
              ...old,
              onboarded: true,
              firstRun: { version: FIRST_RUN_VERSION, step: null, skipped },
            }
          : old,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      if (userId) void writePref(draftKey(userId), '');
      router.replace(to);
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
        onPress={() => setStep('name')}
        className="flex-1 items-center justify-center bg-ink"
        testID="splash"
      >
        <Wordmark size="hero" className="text-bg" />
      </Pressable>
    );
  }

  const n = FIRST_RUN_STEPS.indexOf(step) + 1;
  const back = () => go(before(step));

  if (step === 'looks' || step === 'pieces') {
    return (
      <PrimaryScope>
        <CaptureStep
          key={step}
          mode={step}
          step={n}
          onBack={back}
          onDone={() => done(step)}
          onSkip={() => skip(step)}
        />
      </PrimaryScope>
    );
  }
  if (step === 'twin') {
    return (
      <PrimaryScope>
        <TwinStep
          step={n}
          onBack={back}
          onDone={(own) => {
            nativeAnalytics.track('onboarding_captured', { step: 'twin', n: own ? 1 : 0 });
            if (own) done('twin');
            else skip('twin');
          }}
          onSkip={() => skip('twin')}
        />
      </PrimaryScope>
    );
  }
  if (step === 'outfit') {
    return (
      <PrimaryScope>
        <OutfitStep
          step={n}
          busy={busy}
          error={error}
          onBack={back}
          onSaved={(day, lookId) => {
            track('outfit', 'answered');
            nativeAnalytics.track('onboarding_captured', { step: 'outfit', n: 1 });
            void finish({ pathname: '/', params: { day, saved: lookId } });
          }}
          onSkip={() => {
            track('outfit', 'skipped');
            void finish('/');
          }}
        />
      </PrimaryScope>
    );
  }

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
      {/* No sign out here (Annie, 17 Nov: unnecessary); her answers are kept as she goes. */}
    </>
  );

  const screens: Record<
    'name' | 'identity' | 'styles' | 'brands',
    { title: string; titleEm: string; footer: ReactNode; body: ReactNode }
  > = {
    name: {
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
    identity: {
      ...copy.identity,
      footer: footer(
        copy.continue,
        () => {
          track('identity', 'answered');
          go('styles');
        },
        !identity,
      ),
      body: <IdentityStep value={identity} onChange={setIdentity} />,
    },
    styles: {
      ...copy.styles,
      footer: footer(copy.continue, () => {
        track('styles', styles.length === 0 ? 'skipped' : 'answered');
        go('brands');
      }),
      body: (
        <StylesStep
          identity={identity}
          value={styles}
          onToggle={(t) => setStyles((s) => toggle(s, t))}
        />
      ),
    },
    brands: {
      ...copy.brands,
      footer: footer(copy.continue, () => void saveAnswers()),
      body: (
        <BrandsStep wall={wall} value={brands} onToggle={(b) => setBrands((s) => toggle(s, b))} />
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
          step={n}
          title={s.title}
          titleEm={s.titleEm}
          onBack={step === 'name' ? undefined : back}
          footer={s.footer}
        >
          {s.body}
        </FirstRunFrame>
      </KeyboardAvoidingView>
    </PrimaryScope>
  );
}
