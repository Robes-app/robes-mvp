'use client';

import type { PieceValues } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { pattern, shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { suggestPieceName } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Text } from '@robes/ui';
import { type ReactNode, useId } from 'react';
import { PatternSwatch, ShadeSwatch } from './colour-field';
import type { PieceField } from './piece-field-sheet';

const copy = wardrobe.piece;
const fields = wardrobe.fields;

// One piece anatomy (legacy Piece_Sheet 01): every fact is a row under a named section, and a
// tap opens that one field's drawer. Nothing on the record is a form. Resting rows sit on white with
// a hairline; the warm edge means selected, and no row is selected.
export function PieceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="flex flex-col divide-y divide-hairline overflow-hidden rounded-crisp border border-hairline bg-surface-raised">
        {children}
      </div>
    </section>
  );
}

export function PieceRow({
  label,
  value,
  hint,
  swatch,
  check,
  onClick,
  children,
}: {
  label: string;
  // What is filed, in ink.
  value?: string | null;
  // What an empty row offers instead, in the faint ink ("e.g. Toteme", "Choose", "Optional").
  hint?: string;
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
      {/* The label never gives way: the value yields its width and ends in an ellipsis. */}
      <span className="flex min-w-0 items-center gap-3">
        <Text as="span" size="small" className="shrink-0 whitespace-nowrap">
          {label}
        </Text>
        {check ? (
          <span className="shrink-0 font-sans text-accent-warm text-xs" title={check}>
            {copy.check}
            <span className="sr-only">{`: ${check}`}</span>
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {swatch}
          <Text
            as="span"
            size="small"
            tone={filled ? 'default' : 'faint'}
            className="min-w-0 truncate text-right"
          >
            {value || (onClick ? (hint ?? fields.hints.optional) : '')}
          </Text>
        </span>
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

// The Name row as a field where she types it in place (redline 06): a drawer for one line of text
// is a detour. The placeholder offers Robes' name from the colour and category, never applies it.
function NameRow({
  value,
  offer,
  onChange,
}: {
  value: string;
  offer: string | null;
  onChange: (label: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center gap-3 px-4">
      <label htmlFor={id} className="shrink-0 whitespace-nowrap font-sans text-ink text-sm">
        {copy.label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={120}
        autoComplete="off"
        placeholder={offer ?? fields.name.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 min-w-0 flex-1 border-0 border-transparent border-b bg-transparent text-right font-sans text-base text-ink placeholder:text-ink-faint focus-visible:border-ink focus-visible:shadow-[0_1px_0_0_var(--color-ink)] focus-visible:outline-none sm:text-sm"
      />
    </div>
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

// The leaf of the category (redline 08): "Crew neck jumper", not the whole path — the family
// belongs to the picker's header.
export const categoryLeaf = (v: RecordValues): string | null =>
  v.categoryL3 ?? v.categoryL2 ?? v.category ?? null;

// The record's four sections (legacy Piece_Sheet 01), shared by the piece page, Review and Add
// without a photo, so a piece reads the same everywhere. `withName` adds the Name row where the
// name isn't already the heading — a drawer row, or a field typed in place when `onName` is given;
// `reading` holds every value at "Reading…" while Robes reads.
// Native twin: RecordRows in features/wardrobe/PieceRows.tsx.
export function RecordRows({
  values,
  onField,
  onName,
  withName = false,
  reading = false,
}: {
  values: RecordValues;
  onField: (field: PieceField) => void;
  onName?: (label: string) => void;
  withName?: boolean;
  reading?: boolean;
}) {
  const mainShade = shade(values.colourShade);
  // Each additional colour shows its own dot, and the print its own square, beside the names
  // (beta's rows): a colour is read at a glance, never only spelled out.
  const extraShades = values.colourExtra.flatMap((x) => {
    const found = shade(x);
    return found ? [found] : [];
  });
  const extras = extraShades.map((x) => x.name).join(' · ');
  const print = pattern(values.print);
  const v = (value: string | null | undefined) => (reading ? wardrobe.add.review.reading : value);
  const open = (field: PieceField) => (reading ? undefined : () => onField(field));
  return (
    // The sections own their spacing, so every screen that holds them reads the same.
    <div className="flex flex-col gap-6">
      <PieceSection title={copy.sections.piece}>
        {withName && onName && !reading ? (
          <NameRow
            value={values.label}
            offer={suggestPieceName({
              colourName: mainShade?.name ?? null,
              categoryL2: values.categoryL2,
              categoryL3: values.categoryL3,
            })}
            onChange={onName}
          />
        ) : withName ? (
          <PieceRow label={copy.label} value={v(values.label)} onClick={open('label')} />
        ) : null}
        <PieceRow
          label={copy.rows.category}
          value={v(categoryLeaf(values))}
          hint={fields.hints.category}
          onClick={open('category')}
        />
        <PieceRow
          label={copy.brand}
          value={v(values.brand)}
          hint={fields.hints.brand}
          onClick={open('brand')}
        />
      </PieceSection>

      <PieceSection title={copy.sections.colour}>
        <PieceRow
          label={copy.rows.colour}
          value={v(mainShade?.name ?? null)}
          swatch={mainShade && !reading ? <ShadeSwatch shade={mainShade} size={18} /> : undefined}
          check={values.colourCheck && !reading ? wardrobe.colour.check : undefined}
          onClick={open('colour')}
        />
        <PieceRow
          label={copy.rows.extra}
          value={v(extras)}
          swatch={
            extraShades.length && !reading ? (
              <span className="flex shrink-0 items-center gap-1">
                {extraShades.map((x) => (
                  <ShadeSwatch key={x.id} shade={x} size={18} />
                ))}
              </span>
            ) : undefined
          }
          onClick={open('extra')}
        />
        <PieceRow
          label={copy.rows.print}
          value={v(print?.name ?? wardrobe.colour.plain)}
          swatch={print && !reading ? <PatternSwatch pattern={print} size={18} /> : undefined}
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
        {/* A filled note prints beneath, and the row's own value says the door is to change it. */}
        <PieceRow
          label={copy.rows.notes}
          value={v(values.notes ? fields.edit : null)}
          onClick={open('notes')}
        >
          {values.notes && !reading ? (
            <Text size="small" tone="muted" italic className="pr-6">
              {values.notes}
            </Text>
          ) : null}
        </PieceRow>
      </PieceSection>
    </div>
  );
}
