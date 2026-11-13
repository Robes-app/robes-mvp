'use client';

import { Icon, type IconName } from '@robes/icons/web';
import type { ReactNode } from 'react';
import { usePrimaryGuard } from './button';
import { cn } from './cn';

interface Base {
  // One word, authored in sentence case ("Capture"); the style sets it in capitals.
  label: string;
  // What a reader hears when the word alone doesn't say it ("Capture a look for today").
  ariaLabel?: string;
  disabled?: boolean;
  testId?: string;
}

// A cream disc names its glyph; the primary (home's Create) defaults to the sparkle.
export type ActionDiscProps = Base & { onClick: () => void } & (
    | { primary?: false; icon: IconName }
    | { primary: true; icon?: IconName }
  );

const face = {
  cream:
    'size-14 bg-surface-sunk text-ink-muted shadow-disc motion-safe:transition-opacity motion-safe:duration-150 group-hover:opacity-90',
  // Already ink, so it never darkens on hover.
  primary: 'size-[66px] bg-ink text-bg shadow-disc-primary',
} as const;
const ring =
  'group-focus-visible:outline-[1.5px] group-focus-visible:outline-offset-2 group-focus-visible:outline-focus-ring group-focus-visible:outline-solid';
const word = {
  cream: 'type-label tracking-[0.16em] text-ink-muted',
  primary: 'type-label font-semibold tracking-[0.16em] text-ink',
} as const;

// Felix's ActionDisc: a 56px `surface-sunk` disc on the disc shadow with a 19px `ink-soft` glyph,
// its one-word label beneath in the label caps at 0.16em. The way into a look (Capture · Create ·
// Pick) or onto it (Swap · Edit); never a primary commit. `primary` is home's Create: a 66px ink
// face with a 23px cream glyph at a 1.4 stroke, an ink SemiBold label, in an 80px slot raised 10px
// so its foot meets its neighbours'. It is the screen's one ink action (Annie, 13 Nov).
// Twin of ui-native ActionDisc.tsx.
export function ActionDisc(props: ActionDiscProps) {
  const { label, ariaLabel, disabled = false, testId, primary = false } = props;
  const icon = props.icon ?? 'describe';
  const tone = primary ? 'primary' : 'cream';
  // The primary disc is a filled ink control: it counts against the one per screen (UX-26).
  usePrimaryGuard(primary);
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      data-testid={testId}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-pill',
        primary && '-mt-2.5 w-20',
        disabled && 'pointer-events-none opacity-40',
        'focus-visible:outline-none',
      )}
    >
      {/* Felix rings the face, not the column: 1.5px ink at a 2px offset. */}
      <span className={cn('flex items-center justify-center rounded-pill', ring, face[tone])}>
        {primary ? <Icon name={icon} size={23} stroke={1.4} /> : <Icon name={icon} size={19} />}
      </span>
      <span className={word[tone]}>{label}</span>
    </button>
  );
}

// Two or three discs in a centred row, 28 apart, standing half over the photo's bottom edge
// (Felix `.fx-discs`).
export function ActionDiscs({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative z-10 -mt-7 flex items-start justify-center gap-7', className)}>
      {children}
    </div>
  );
}
