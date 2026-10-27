import { Icon } from '@robes/icons/web';
import type { ButtonHTMLAttributes, HTMLAttributes, Ref } from 'react';
import { cn, focusRing } from './cn';

const base =
  'relative inline-flex items-center gap-1.5 rounded-pill border font-sans motion-safe:transition-colors motion-safe:duration-150';
// md: 44 tall. sm: a 36-tall chip at 12px for dense walls (brands, icons), its hit area still 44.
const sizes = {
  md: 'min-h-11 px-4 text-sm',
  sm: "min-h-9 px-3.5 text-xs after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
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
      ? 'border-selected-line bg-selected text-ink'
      : 'border-rule-mid bg-surface-raised text-ink-muted hover:border-border-control hover:text-ink',
    'disabled:border-hairline disabled:text-ink-faint',
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

// Selected is warm, never black or white: the warm fill on the warm line, ink text and a check. Unselected, the
// label is the cue, so the edge is the fine rule-mid (the native twin is ui-native Pill.tsx).
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
        'inline-flex items-center gap-1 rounded-pill border border-hairline bg-surface px-3 py-1 font-sans text-xs text-ink-muted',
        className,
      )}
    />
  );
}
