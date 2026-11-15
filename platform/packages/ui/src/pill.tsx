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

export type PillTone = 'warm' | 'filter' | 'option';

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
      ? tone === 'warm'
        ? 'border border-selected-line bg-selected'
        : 'border border-token-line bg-surface-sunk'
      : tone === 'filter'
        ? 'border border-warm-line bg-transparent text-ink-faint hover:border-token-line'
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
  // Felix's warm fill (a kept choice), or a filter (Front Door 2b/3b, 15 Nov): `filter` is a quick
  // chip in a filter row, outlined in the warm line at rest; `option` is a choice in the Filter
  // sheet, white on the fine edge at rest. Picked, both take the one filter selection: the pale
  // sunk fill on a 1px umber line, ink label, no check.
  tone?: PillTone;
  // A live count after the label, lighter ("Work 3").
  count?: number;
  // A kept name she can let go: × after the label instead of the check.
  removable?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

// Felix: unselected is white on the fine 0.5px `rule-mid` with an ink label; selected is the warm
// fill on a 1px warm line. The check stays on a selected pill though Felix drops it: the warm fill
// alone is too close to white to carry the state (D1). A filter chip needs no check: its umber
// edge carries it. The native twin is ui-native Pill.tsx.
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
  const filter = tone !== 'warm';
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
      {selected && !removable && !filter ? (
        <Icon name="check" size={size === 'sm' ? 14 : 16} />
      ) : null}
      {children}
      {count !== undefined ? (
        <span className={cn(size === 'sm' ? 'text-[10px]' : 'text-[11px]', 'text-ink-faint')}>
          {count}
        </span>
      ) : null}
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
