import { Icon } from '@robes/icons/web';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cn, focusRing } from './cn';

const base =
  'inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-4 font-sans text-sm motion-safe:transition-colors motion-safe:duration-150';

// The pill anatomy on its own, for the controls that are not toggles — a menu
// trigger or a disclosure, which must not claim aria-pressed.
export function pillClasses({ selected = false }: { selected?: boolean } = {}): string {
  return cn(
    base,
    selected
      ? 'border-selected-line bg-selected text-ink'
      : 'border-rule-mid bg-surface-raised text-ink-muted hover:border-border-control hover:text-ink',
    'disabled:border-hairline disabled:text-ink-faint',
    focusRing,
  );
}

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  selected?: boolean;
}

// Selected is raised, never black: white on the warm line, ink text and a check. Unselected, the
// label is the cue, so the edge is the fine rule-mid (the native twin is ui-native Pill.tsx).
export function Pill({
  selected = false,
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
      className={cn(pillClasses({ selected }), className)}
    >
      {selected ? <Icon name="check" size={16} /> : null}
      {children}
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
