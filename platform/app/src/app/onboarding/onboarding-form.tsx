'use client';

import { useApiClient } from '@robes/api-client/react';
import { firstRun as copy, onboarding } from '@robes/copy';
import { onboardingBrands, type StyleType } from '@robes/core/style-dna';
import { Button, ErrorText, Field, Heading, Wordmark } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import {
  BrandsStep,
  type Colours,
  ColoursStep,
  type Identity,
  IdentityStep,
  StylesStep,
} from './steps';

type Step = 1 | 2 | 3 | 4 | 5;
const STEPS = 5;
const STEP_NAMES = { 1: 'name', 2: 'identity', 3: 'styles', 4: 'brands', 5: 'colours' } as const;
const SPLASH_MS = 2_000;

const firstWord = (name: string): string | null => name.trim().split(/\s+/)[0] || null;
const toggle = <T,>(list: readonly T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

// The step chrome (handoff 30 Oct; twin: mobile features/home/FirstRunFrame.tsx): back · the
// eyebrow · five segments · the title · the body · one ink button docked at the foot.
function Frame({
  step,
  title,
  titleEm,
  onBack,
  children,
  footer,
}: {
  step: Step;
  title: string;
  titleEm: string;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="grid min-h-11 grid-cols-[64px_1fr_64px] items-center px-3.5 pt-1">
        <span>
          {onBack ? (
            // The design's back: a 32px white circle on a hairline, in a 44px target.
            <button
              type="button"
              aria-label={copy.backLabel}
              onClick={onBack}
              className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full border border-rule-mid bg-surface-raised pr-px pb-0.5 font-display text-ink text-xl leading-none"
              >
                {copy.backGlyph}
              </span>
            </button>
          ) : null}
        </span>
        {/* Rose eyebrow, 500 9px at .26em: the deep rose, the one that reads at 4.5:1 this small. */}
        <p className="whitespace-nowrap text-center font-medium font-sans text-[9px] text-accent-warm uppercase leading-none tracking-[0.26em]">
          {copy.eyebrow}
        </p>
        <span />
      </header>
      <div
        className="grid grid-cols-5 gap-1.5 px-6 pt-3.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS}
        aria-valuenow={step}
        aria-label={copy.progress(step, STEPS)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-px motion-safe:transition-colors motion-safe:duration-[400ms] ${n <= step ? 'bg-ink' : 'bg-hairline'}`}
          />
        ))}
      </div>
      <main className="flex flex-1 flex-col gap-7 px-6 pt-7 pb-6">
        <Heading level={1} size="lg">
          {title} <em>{titleEm}</em>
        </Heading>
        {children}
      </main>
      <footer className="sticky bottom-0 flex flex-col gap-3 border-hairline border-t bg-bg px-6 pt-3.5 pb-8">
        {footer}
      </footer>
    </div>
  );
}

// Splash → name → identity → styles → brands → colours → Home (handoff 30 Oct; twin: mobile
// app/onboarding/). Name and identity are required; the rest may be left empty. Her name saves on
// its own step; everything else saves once, on Get started.
export function OnboardingForm({ initialFirstName }: { initialFirstName: string }) {
  const router = useRouter();
  const api = useApiClient();
  const { track } = useAnalytics().analytics;
  const [step, setStep] = useState<Step | 'splash'>('splash');
  const [name, setName] = useState(initialFirstName);
  const [saved, setSaved] = useState(initialFirstName);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [styles, setStyles] = useState<StyleType[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [colours, setColours] = useState<Colours>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (step !== 'splash') track('onboarding_step', { step: STEP_NAMES[step], outcome: 'shown' });
  }, [track, step]);

  const answered = (s: Step, skipped = false) =>
    track('onboarding_step', { step: STEP_NAMES[s], outcome: skipped ? 'skipped' : 'answered' });

  async function saveName(event: FormEvent) {
    event.preventDefault();
    const first = firstWord(name);
    if (!first) return;
    setError(null);
    if (first !== saved) {
      setBusy(true);
      try {
        await api.call('me.update', { input: { firstName: first } });
        setSaved(first);
      } catch {
        setError(onboarding.failed);
        return;
      } finally {
        setBusy(false);
      }
    }
    answered(1);
    setStep(2);
  }

  async function finish() {
    setError(null);
    setBusy(true);
    try {
      await api.call('me.onboarding.complete', {
        input: { ...(identity ? { identity } : {}), styles, brands, colours },
      });
    } catch {
      setError(onboarding.failed);
      setBusy(false);
      return;
    }
    answered(5, Object.keys(colours).length === 0);
    track('onboarding_answered', {
      styles: styles.length,
      brands: brands.length,
      colours: Object.keys(colours).length,
    });
    router.replace('/');
    router.refresh();
  }

  if (step === 'splash') {
    return (
      <button
        type="button"
        onClick={() => setStep(1)}
        className="flex min-h-dvh w-full items-center justify-center bg-ink text-bg"
      >
        <Wordmark size="hero" />
      </button>
    );
  }

  const back = step > 1 ? () => setStep((step - 1) as Step) : undefined;
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

  if (step === 1) {
    return (
      <form onSubmit={saveName}>
        <Frame
          step={1}
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

  if (step === 2) {
    return (
      <Frame
        step={2}
        title={copy.identity.title}
        titleEm={copy.identity.titleEm}
        onBack={back}
        footer={cta(
          copy.continue,
          () => {
            answered(2);
            setStep(3);
          },
          !identity,
        )}
      >
        <IdentityStep value={identity} onChange={setIdentity} />
      </Frame>
    );
  }

  if (step === 3) {
    return (
      <Frame
        step={3}
        title={copy.styles.title}
        titleEm={copy.styles.titleEm}
        onBack={back}
        footer={cta(copy.continue, () => {
          answered(3, styles.length === 0);
          setStep(4);
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

  if (step === 4) {
    return (
      <Frame
        step={4}
        title={copy.brands.title}
        titleEm={copy.brands.titleEm}
        onBack={back}
        footer={cta(copy.continue, () => {
          answered(4, brands.length === 0);
          setStep(5);
        })}
      >
        <BrandsStep wall={wall} value={brands} onToggle={(b) => setBrands((s) => toggle(s, b))} />
      </Frame>
    );
  }

  return (
    <Frame
      step={5}
      title={copy.colours.title}
      titleEm={copy.colours.titleEm}
      onBack={back}
      footer={cta(copy.finish, finish)}
    >
      <ColoursStep
        value={colours}
        onChange={(family, v) =>
          setColours((c) => {
            const { [family]: _, ...rest } = c;
            return v === 0 ? rest : { ...rest, [family]: v };
          })
        }
      />
    </Frame>
  );
}
