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

// The pill anatomy on its own, for the controls that are not toggles — a menu
// trigger or a disclosure, which must not claim aria-pressed.
export function pillClasses({
  selected = false,
  size = 'md',
}: {
  selected?: boolean;
  size?: keyof typeof sizes;
} = {}): string {
  return cn(
    base,
    sizes[size],
    selected
      ? 'border border-selected-line bg-selected'
      : 'border-[0.5px] border-rule-mid bg-surface-raised hover:border-border-control',
    'disabled:opacity-40',
    focusRing,
  );
}

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected?: boolean;
  size?: keyof typeof sizes;
  // A kept name she can let go: × after the label instead of the check.
  removable?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

// Felix: unselected is white on the fine 0.5px `rule-mid` with an ink label; selected is the warm
// fill on a 1px warm line. The check stays on a selected pill though Felix drops it: the warm fill
// alone is too close to white to carry the state (D1). The native twin is ui-native Pill.tsx.
export function Pill({
  selected = false,
  size = 'md',
  removable = false,
  type = 'button',
  className,
  children,
  ...rest
}: PillProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={selected}
      className={cn(pillClasses({ selected, size }), className)}
    >
      {selected && !removable ? <Icon name="check" size={size === 'sm' ? 14 : 16} /> : null}
      {children}
      {removable ? <Icon name="close" size={12} className="text-ink-muted" /> : null}
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
