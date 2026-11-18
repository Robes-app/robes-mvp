import { FIRST_RUN_FLOW } from '@robes/contracts';
import { firstRun as copy } from '@robes/copy';
import { Heading } from '@robes/ui';
import type { ReactNode } from 'react';

const STEPS = FIRST_RUN_FLOW.length;

// The step chrome (handoff 30 Oct, seven steps since 18 Nov; twin: mobile
// features/home/FirstRunFrame.tsx): back · the eyebrow · one hairline segment per step, never a
// number on screen (R-S1) · the title · the body · the step's one action docked at the foot,
// Skip under it on a capture step (R-S2).
export function Frame({
  step,
  title,
  titleEm,
  onBack,
  children,
  footer,
  fill = false,
}: {
  step: number;
  title: string;
  titleEm: string;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
  // The body takes the height left under the title (a capture card, design Q6).
  fill?: boolean;
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
              className="flex size-11 items-center justify-center rounded-full focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
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
        className="grid grid-cols-7 gap-1.5 px-6 pt-3.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS}
        aria-valuenow={step}
        aria-label={copy.progress(step, STEPS)}
      >
        {FIRST_RUN_FLOW.map((_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={`h-px motion-safe:transition-colors motion-safe:duration-[400ms] ${n <= step ? 'bg-ink' : 'bg-hairline'}`}
          />
        ))}
      </div>
      <main className={`flex flex-1 flex-col gap-7 px-6 pt-7 pb-6 ${fill ? 'min-h-0' : ''}`}>
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

// A quiet text link under the step's one action (R-S2): Skip, Add more.
export function QuietLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 self-center font-sans text-ink-muted text-sm focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      {label}
    </button>
  );
}
