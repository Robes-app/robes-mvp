'use client';

import { useApiClient } from '@robes/api-client/react';
import {
  FIRST_RUN_FLOW,
  FIRST_RUN_VERSION,
  type FirstRunCapture,
  type FirstRunFlowStep,
  type FirstRunStep,
} from '@robes/contracts';
import { firstRun as copy, onboarding } from '@robes/copy';
import { onboardingBrands, type StyleType } from '@robes/core/style-dna';
import { Button, ErrorText, Field, Wordmark } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { useDeviceTimeZone } from '@/components/shell/device-timezone';
import { CaptureStep } from './capture-step';
import { Frame } from './frame';
import { OutfitStep } from './outfit-step';
import { BrandsStep, type Identity, IdentityStep, StylesStep } from './steps';

const SPLASH_MS = 2_000;
const after = (s: FirstRunFlowStep): FirstRunFlowStep | null =>
  FIRST_RUN_FLOW[FIRST_RUN_FLOW.indexOf(s) + 1] ?? null;
const before = (s: FirstRunFlowStep): FirstRunFlowStep | null =>
  FIRST_RUN_FLOW[FIRST_RUN_FLOW.indexOf(s) - 1] ?? null;

const firstWord = (name: string): string | null => name.trim().split(/\s+/)[0] || null;
const toggle = <T,>(list: readonly T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export interface FirstRunStart {
  // Where she left off (a capture step), or null to start at the splash.
  step: (FirstRunCapture & FirstRunFlowStep) | null;
  skipped: FirstRunCapture[];
  identity: Identity | null;
  styles: StyleType[];
  brands: string[];
}

// Getting to know you, seven steps (onboarding PRD, 17 Nov; the digital twin out since 18 Nov;
// twin: mobile app/onboarding/): Splash → name → identity → styles → brands → saved looks →
// pieces you love → today's outfit → Home. The first four as live since the handoff of 30 Oct; her answers save on Brands
// without onboarding her; each capture step is skippable; she is onboarded as she leaves for
// Home. Her step is on her profile, so she resumes where she left; an account onboarded before
// walks it once, its answers prefilled.
export function OnboardingForm({
  initialFirstName,
  start,
}: {
  initialFirstName: string;
  start: FirstRunStart;
}) {
  const router = useRouter();
  const api = useApiClient();
  const { track } = useAnalytics().analytics;
  // Today's outfit pins to her browser's day, so the server's today must agree (B6).
  useDeviceTimeZone();
  const [step, setStep] = useState<FirstRunFlowStep | 'splash'>(start.step ?? 'splash');
  const [name, setName] = useState(initialFirstName);
  const [saved, setSaved] = useState(initialFirstName);
  const [identity, setIdentity] = useState<Identity | null>(start.identity);
  const [styles, setStyles] = useState<StyleType[]>(start.styles);
  const [brands, setBrands] = useState<string[]>(start.brands);
  const [skipped, setSkipped] = useState<FirstRunCapture[]>(start.skipped);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (step !== 'splash') track('onboarding_step', { step, outcome: 'shown' });
  }, [track, step]);
  // Her step on the server as she goes (R-S3), so leaving and returning resumes there.
  const first = useRef(true);
  useEffect(() => {
    if (step === 'splash') return;
    if (first.current && start.step === step) {
      first.current = false;
      return;
    }
    first.current = false;
    void api.call('me.onboarding.save', { input: { step, skipped } }).catch(() => {});
  }, [api, step, skipped, start.step]);

  const answered = (s: FirstRunStep, outcome: 'answered' | 'skipped' = 'answered') =>
    track('onboarding_step', { step: s, outcome });
  const go = (s: FirstRunFlowStep | null) => {
    setError(null);
    if (s) setStep(s);
  };
  const skip = (s: FirstRunCapture & FirstRunFlowStep) => {
    answered(s, 'skipped');
    setSkipped((all) => (all.includes(s) ? all : [...all, s]));
    go(after(s));
  };
  const done = (s: FirstRunCapture & FirstRunFlowStep) => {
    answered(s);
    setSkipped((all) => all.filter((x) => x !== s));
    go(after(s));
  };

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const firstName = firstWord(name);
    if (!firstName) return;
    setError(null);
    if (firstName !== saved) {
      setBusy(true);
      try {
        await api.call('me.update', { input: { firstName } });
        setSaved(firstName);
      } catch {
        setError(onboarding.failed);
        return;
      } finally {
        setBusy(false);
      }
    }
    answered('name');
    go('identity');
  }

  // Brands' Continue saves 01–04 (R-4.2): her answers are safe if she leaves; she is not
  // onboarded until she goes on to Home.
  async function saveAnswers() {
    setError(null);
    setBusy(true);
    try {
      await api.call('me.onboarding.save', {
        input: { ...(identity ? { identity } : {}), styles, brands, step: 'looks' },
      });
    } catch {
      setError(onboarding.failed);
      setBusy(false);
      return;
    }
    setBusy(false);
    answered('brands', brands.length === 0 ? 'skipped' : 'answered');
    track('onboarding_answered', { styles: styles.length, brands: brands.length, colours: 0 });
    go('looks');
  }

  // Onboarded as she leaves for Home.
  async function finish(to: string) {
    setError(null);
    setBusy(true);
    try {
      await api.call('me.onboarding.complete', { input: { firstRun: FIRST_RUN_VERSION } });
    } catch {
      setError(onboarding.failed);
      setBusy(false);
      return;
    }
    router.replace(to);
    router.refresh();
  }

  if (step === 'splash') {
    return (
      <button
        type="button"
        onClick={() => setStep('name')}
        className="flex min-h-dvh w-full items-center justify-center bg-ink text-bg"
      >
        <Wordmark size="hero" />
      </button>
    );
  }

  const n = FIRST_RUN_FLOW.indexOf(step) + 1;
  const back = () => go(before(step));

  if (step === 'looks' || step === 'pieces') {
    return (
      <CaptureStep
        key={step}
        mode={step}
        step={n}
        onBack={back}
        onDone={() => done(step)}
        onSkip={() => skip(step)}
      />
    );
  }
  if (step === 'outfit') {
    return (
      <OutfitStep
        step={n}
        busy={busy}
        error={error}
        onBack={back}
        onSaved={(day, lookId) => {
          answered('outfit');
          track('onboarding_captured', { step: 'outfit', n: 1 });
          void finish(`/?day=${day}&saved=${lookId}`);
        }}
        onSkip={() => {
          answered('outfit', 'skipped');
          void finish('/');
        }}
      />
    );
  }

  const cta = (label: string, onClick?: () => void, disabled = false) => (
    <>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button
        variant="primary"
        type={onClick ? 'button' : 'submit'}
        onClick={onClick}
        disabled={disabled}
        loading={busy}
        loadingLabel={onboarding.saving}
      >
        {label}
      </Button>
    </>
  );

  if (step === 'name') {
    return (
      <form onSubmit={saveName}>
        <Frame
          step={n}
          title={copy.name.title}
          titleEm={copy.name.titleEm}
          footer={cta(copy.continue, undefined, !name.trim())}
        >
          <Field
            variant="underline"
            labelHidden
            label={copy.name.label}
            name="firstName"
            autoComplete="given-name"
            placeholder={copy.name.placeholder}
            required
            maxLength={60}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Frame>
      </form>
    );
  }

  if (step === 'identity') {
    return (
      <Frame
        step={n}
        title={copy.identity.title}
        titleEm={copy.identity.titleEm}
        onBack={back}
        footer={cta(
          copy.continue,
          () => {
            answered('identity');
            go('styles');
          },
          !identity,
        )}
      >
        <IdentityStep value={identity} onChange={setIdentity} />
      </Frame>
    );
  }

  if (step === 'styles') {
    return (
      <Frame
        step={n}
        title={copy.styles.title}
        titleEm={copy.styles.titleEm}
        onBack={back}
        footer={cta(copy.continue, () => {
          answered('styles', styles.length === 0 ? 'skipped' : 'answered');
          go('brands');
        })}
      >
        <StylesStep
          identity={identity}
          value={styles}
          onToggle={(t) => setStyles((s) => toggle(s, t))}
        />
      </Frame>
    );
  }

  return (
    <Frame
      step={n}
      title={copy.brands.title}
      titleEm={copy.brands.titleEm}
      onBack={back}
      footer={cta(copy.continue, () => void saveAnswers())}
    >
      <BrandsStep wall={wall} value={brands} onToggle={(b) => setBrands((s) => toggle(s, b))} />
    </Frame>
  );
}
