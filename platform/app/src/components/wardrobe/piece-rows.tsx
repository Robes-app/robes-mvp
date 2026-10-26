'use client';

import type { PieceValues } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { pattern, shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Text } from '@robes/ui';
import type { ReactNode } from 'react';
import { ShadeSwatch } from './colour-field';
import type { PieceField } from './piece-field-sheet';

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

export const money = (price: number | null, currency: string | null): string | null =>
  price === null
    ? null
    : new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency ?? 'EUR',
        maximumFractionDigits: 0,
      }).format(price);

export type RecordValues = PieceValues & {
  category?: string | null;
  colourCheck?: boolean;
  materialCheck?: boolean;
};

// The record's four sections (legacy Piece_Sheet 01), shared by the piece page, Review and Add
// without a photo, so a piece reads the same everywhere. `withName` adds the Name row where the
// name isn't already the heading; `reading` holds every value at "Reading…" while Robes reads.
// Native twin: RecordRows in features/wardrobe/PieceRows.tsx.
export function RecordRows({
  values,
  onField,
  withName = false,
  reading = false,
}: {
  values: RecordValues;
  onField: (field: PieceField) => void;
  withName?: boolean;
  reading?: boolean;
}) {
  const mainShade = shade(values.colourShade);
  const extras = values.colourExtra
    .map((x) => shade(x)?.name)
    .filter(Boolean)
    .join(' · ');
  const v = (value: string | null | undefined) => (reading ? wardrobe.add.review.reading : value);
  const open = (field: PieceField) => (reading ? undefined : () => onField(field));
  return (
    <>
      <PieceSection title={copy.sections.piece}>
        {withName ? (
          <PieceRow label={copy.label} value={v(values.label)} onClick={open('label')} />
        ) : null}
        <PieceRow
          label={copy.rows.category}
          value={v(
            [values.categoryL2 ?? values.category, values.categoryL3].filter(Boolean).join(' · '),
          )}
          onClick={open('category')}
        />
        <PieceRow label={copy.brand} value={v(values.brand)} onClick={open('brand')} />
      </PieceSection>

      <PieceSection title={copy.sections.colour}>
        <PieceRow
          label={copy.rows.colour}
          value={v(mainShade?.name ?? null)}
          swatch={mainShade && !reading ? <ShadeSwatch shade={mainShade} size={18} /> : undefined}
          check={values.colourCheck && !reading ? wardrobe.colour.check : undefined}
          onClick={open('colour')}
        />
        <PieceRow label={copy.rows.extra} value={v(extras)} onClick={open('extra')} />
        <PieceRow
          label={copy.rows.print}
          value={v(pattern(values.print)?.name ?? wardrobe.colour.plain)}
          onClick={open('print')}
        />
        <PieceRow
          label={copy.rows.material}
          value={v(material(values.material)?.name ?? null)}
          check={values.materialCheck && !reading ? wardrobe.material.check : undefined}
          onClick={open('material')}
        />
      </PieceSection>

      <PieceSection title={copy.sections.wearing}>
        <PieceRow
          label={copy.rows.season}
          value={v(values.seasonBand ? wardrobe.filter.seasons[values.seasonBand] : null)}
          onClick={open('season')}
        />
        <PieceRow
          label={copy.rows.wearFor}
          value={v(values.wearFor.join(' · '))}
          onClick={open('wearFor')}
        />
      </PieceSection>

      <PieceSection title={copy.sections.fit}>
        <PieceRow label={copy.rows.size} value={v(values.size)} onClick={open('size')} />
        <PieceRow
          label={copy.rows.price}
          value={v(money(values.price, values.currency))}
          onClick={open('price')}
        />
        <PieceRow
          label={copy.rows.notes}
          value={reading ? wardrobe.add.review.reading : null}
          onClick={open('notes')}
        >
          {values.notes && !reading ? (
            <Text size="small" tone="muted" italic className="pr-6">
              {values.notes}
            </Text>
          ) : null}
        </PieceRow>
      </PieceSection>
    </>
  );
}
