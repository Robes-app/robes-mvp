'use client';

import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Text } from '@robes/ui';
import type { ReactNode } from 'react';

const copy = wardrobe.piece;

// One piece anatomy (legacy Piece_Sheet 01): every fact is a row under a named section, and a
// tap opens that one field's drawer. Nothing on the record is a form.
export function PieceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="flex flex-col divide-y divide-hairline overflow-hidden rounded-crisp border border-hairline bg-surface">
        {children}
      </div>
    </section>
  );
}

export function PieceRow({
  label,
  value,
  swatch,
  check,
  onClick,
  children,
}: {
  label: string;
  // What is filed; nothing filed reads as the door it is.
  value?: string | null;
  swatch?: ReactNode;
  // Robes' read here is a guess she should look at: the rose "Check" mark, with its reason.
  check?: string | undefined;
  // No handler means the row is a fact, not a door: no chevron, nothing to press.
  onClick?: () => void;
  // A longer answer (a note) sits under the row's own line.
  children?: ReactNode;
}) {
  const filled = Boolean(value);
  const body = (
    <>
      <span className="flex items-center gap-3">
        <Text size="small" className="flex-1">
          {label}
        </Text>
        {check ? (
          <span className="font-sans text-accent-warm text-xs" title={check}>
            {copy.check}
            <span className="sr-only">{`: ${check}`}</span>
          </span>
        ) : null}
        {swatch}
        <Text size="small" tone={filled ? 'muted' : 'faint'} className="truncate text-right">
          {value || (onClick ? copy.add : '')}
        </Text>
        {onClick ? <Icon name="forward" size={15} className="shrink-0 text-ink-faint" /> : null}
      </span>
      {children}
    </>
  );
  const shell = 'flex min-h-12 flex-col gap-1 px-4 py-3 text-left';
  if (!onClick) return <div className={shell}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${shell} hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring`}
    >
      {body}
    </button>
  );
}
