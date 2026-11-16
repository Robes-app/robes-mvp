// No 'use client': server components style links as buttons with these.
import { cn, focusRing } from './cn';

const variants = {
  primary:
    // The one primary: an ink pill, 48pt. While it waits on her it is the cream-200 pill with an
    // ink-soft label (Annie's twin consent design, 13 Nov; supersedes the 26 Oct 30% ink).
    'min-h-12 bg-ink text-bg hover:opacity-88 disabled:bg-surface-sunk disabled:text-ink-muted disabled:opacity-100',
  // Felix's outline: white on the fine `rule-mid` edge (the label is the cue), 40 tall at 0 20.
  outline:
    'min-h-10 border-[0.5px] border-rule-mid bg-surface-raised text-ink hover:border-ink disabled:opacity-40',
  // Felix's chip: the small cream pill, 28 tall. Its 9px caps sit in `ink`, not Felix's `ink-soft`:
  // on `cream-200` that pair misses 4.5:1, and the floor wins (D1).
  chip: 'min-h-7 bg-surface-sunk text-ink hover:opacity-80 disabled:opacity-40',
  quiet: 'min-h-9 text-ink-muted hover:text-ink disabled:text-ink-faint',
  // The consequence of a destructive confirm (Delete in an AlertDialog): the primary's pill in
  // `danger` with a white label. Felix keeps danger off text; this fill is its one other use.
  danger: 'min-h-12 bg-danger text-surface-raised hover:opacity-88 disabled:opacity-40',
} as const;

export type ButtonVariant = keyof typeof variants;

// The ring that takes each short button's hit area to 44px: (44 − height) / 2 above and below.
const hitRing: Record<Exclude<ButtonVariant, 'primary' | 'danger'>, string> = {
  outline: 'after:-inset-y-0.5',
  chip: 'after:-inset-y-2',
  quiet: 'after:-inset-y-1',
};

export function buttonClasses({
  variant = 'outline',
  block = false,
}: {
  variant?: ButtonVariant;
  block?: boolean;
} = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 font-sans font-medium',
    'motion-safe:transition-[opacity,border-color,color] motion-safe:duration-150 disabled:cursor-not-allowed',
    // Felix's `label` caps, authored in sentence case: 10px at 0.22em (a chip 9px at 0.16em); a
    // quiet action is 12px sentence case. Under 48px, an invisible ring grows the hit area to 44.
    variant === 'quiet'
      ? 'px-2 text-xs'
      : cn(
          'rounded-pill uppercase',
          variant === 'chip'
            ? 'px-3 text-[9px] tracking-[0.16em]'
            : cn(
                'text-[10px] tracking-[0.22em]',
                variant === 'primary' || variant === 'danger' ? 'px-7' : 'px-5',
              ),
        ),
    variant !== 'primary' &&
      variant !== 'danger' &&
      cn("relative after:absolute after:inset-x-0 after:content-['']", hitRing[variant]),
    block && 'w-full',
    variants[variant],
    focusRing,
  );
}
