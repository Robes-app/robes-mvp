import { Icon } from '@robes/icons/web';
import type { ButtonHTMLAttributes, HTMLAttributes, Ref } from 'react';
import { cn, focusRing } from './cn';

const base =
  'relative inline-flex items-center gap-1.5 rounded-pill font-sans font-normal text-ink motion-safe:transition-colors motion-safe:duration-150';
// Felix's pills: md 32 tall at 0 13 with 12px text (the category pill), sm 28 tall at 0 11 with
// 11px (the context chip). Both keep a 44 hit area past the visible edge. Twin of ui-native Pill.
const sizes = {
  md: "min-h-8 px-[13px] text-xs after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
  sm: "min-h-7 px-[11px] text-[11px] after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']",
} as const;

export type PillTone = 'warm' | 'rose' | 'ink';

// The pill anatomy on its own, for the controls that are not toggles — a menu
// trigger or a disclosure, which must not claim aria-pressed.
export function pillClasses({
  selected = false,
  size = 'md',
  tone = 'warm',
}: {
  selected?: boolean;
  size?: keyof typeof sizes;
  tone?: PillTone;
} = {}): string {
  return cn(
    base,
    sizes[size],
    selected
      ? tone === 'rose'
        ? 'border border-accent-warm bg-accent-warm text-surface-raised'
        : tone === 'ink'
          ? 'border border-ink bg-ink text-bg'
          : 'border border-selected-line bg-selected'
      : 'border-[0.5px] border-rule-mid bg-surface-raised hover:border-border-control',
    // A disabled chip (a count of 0) sits back at 45% with no pointer, so it reads as a value
    // that isn't here today rather than a choice she could make.
    'disabled:cursor-default disabled:opacity-45 disabled:hover:border-rule-mid',
    focusRing,
  );
}

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected?: boolean;
  size?: keyof typeof sizes;
  // How a selected pill reads: Felix's warm fill (a kept choice), the Front Door's deep rose
  // with a cream label (an active quick chip in a filter row, PRD rev 3 §2.5), or ink with a
  // cream label (an option picked in the filter sheet). The PRD's lighter rose misses 4.5:1
  // under an 11px label, so the darkened rose carries it (D1).
  tone?: PillTone;
  // A live count after the label, lighter ("Work 3").
  count?: number;
  // A kept name she can let go: × after the label instead of the check.
  removable?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

// Felix: unselected is white on the fine 0.5px `rule-mid` with an ink label; selected is the warm
// fill on a 1px warm line. The check stays on a selected pill though Felix drops it: the warm fill
// alone is too close to white to carry the state (D1). A rose pill needs no check: its fill is
// unmistakable. The native twin is ui-native Pill.tsx.
export function Pill({
  selected = false,
  size = 'md',
  tone = 'warm',
  count,
  removable = false,
  type = 'button',
  className,
  children,
  ...rest
}: PillProps) {
  const rose = selected && tone !== 'warm';
  // The count is part of the name ("Work 3"): inline text nodes would otherwise run together.
  const name =
    count !== undefined && typeof children === 'string' ? `${children} ${count}` : undefined;
  return (
    <button
      {...(name ? { 'aria-label': name } : {})}
      {...rest}
      type={type}
      aria-pressed={selected}
      className={cn(pillClasses({ selected, size, tone }), className)}
    >
      {selected && !removable && !rose ? (
        <Icon name="check" size={size === 'sm' ? 14 : 16} />
      ) : null}
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            size === 'sm' ? 'text-[10px]' : 'text-[11px]',
            rose ? 'text-surface-raised/70' : 'text-ink-faint',
          )}
        >
          {count}
        </span>
      ) : null}
      {removable ? (
        <Icon name="close" size={12} className={rose ? undefined : 'text-ink-muted'} />
      ) : null}
    </button>
  );
}

// A static label with the pill anatomy; use Pill when it toggles.
export function Chip({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex min-h-7 items-center gap-1 rounded-pill border-[0.5px] border-rule-mid bg-surface-raised px-[11px] font-sans text-[11px] text-ink',
        className,
      )}
    />
  );
}
