import { Icon } from '@robes/icons/web';
import type { ReactNode } from 'react';
import { cn } from './cn';

// Felix's drill list (LookDetails, SettingsView): one `white` card on a 0.5px `rule-mid` edge,
// 48px rows divided by `hairline` rules. Every list of drill rows is this card; the wardrobe
// piece adopts it next. Twin of ui-native Drill.tsx.
export function DrillList({
  children,
  label,
  className,
  testId,
}: {
  children: ReactNode;
  // Names the list for a reader when it is a set of doors ("Style profile").
  label?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      {...(label ? { role: 'group', 'aria-label': label } : {})}
      data-testid={testId}
      className={cn(
        'divide-y divide-hairline overflow-hidden rounded-soft border-[0.5px] border-rule-mid bg-surface-raised',
        className,
      )}
    >
      {children}
    </div>
  );
}

// The row itself: put it on a <button>, a link or a plain <div> (a row that only reads).
export const drillRowClass =
  'flex h-12 w-full items-center gap-3 pr-3 pl-4 text-left focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';

export interface DrillRowContentProps {
  label: string;
  // The summary at the right: her answer, or what an empty row reads ("None", "Not worn yet").
  value?: ReactNode;
  // `ink-faint` for an empty or quiet summary; `ink-soft` otherwise.
  muted?: boolean;
  // In place of the chevron: the caption's pencil, an external glyph; `null` for none.
  trailing?: ReactNode;
}

// A row's anatomy: the 9px tracked label in `ink-soft`, the 11px summary at the right, then the
// 14px `ink-faint` chevron.
export function DrillRowContent({ label, value, muted = false, trailing }: DrillRowContentProps) {
  return (
    <>
      <span className="type-label shrink-0 text-ink-muted">{label}</span>
      <span
        className={cn(
          'flex min-w-0 flex-1 items-center justify-end gap-3 truncate font-sans text-[11px]',
          muted ? 'text-ink-faint' : 'text-ink-muted',
        )}
      >
        {value}
      </span>
      {trailing === undefined ? (
        <Icon name="forward" size={14} className="shrink-0 text-ink-faint" />
      ) : (
        trailing
      )}
    </>
  );
}

// A drill row that opens something in place (a subview, a dialog, an inline field).
export function DrillRow({
  onClick,
  ariaLabel,
  testId,
  ...content
}: DrillRowContentProps & { onClick: () => void; ariaLabel?: string; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      className={drillRowClass}
    >
      <DrillRowContent {...content} />
    </button>
  );
}
