'use client';

import type { PieceValues, Season } from '@robes/contracts';
import { filters as filterCopy, wardrobe } from '@robes/copy';
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

// One piece anatomy (legacy Piece_Sheet 01; drawn as the Front Door canvas 3b, PRD §7.3): every
// fact is a row in one white card, a small-caps label at the left and the value at the right
// ("Add" while nothing is filed), then › for a row that opens a picker or ✎ for one she types.
// Nothing on the record is a form. Native twin: PieceRows.tsx.
export function PieceSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {title ? <Eyebrow>{title}</Eyebrow> : null}
      <div className="flex flex-col divide-y divide-hairline overflow-hidden rounded-[12px] border border-rule-mid bg-surface-raised">
        {children}
      </div>
    </section>
  );
}

export function PieceRow({
  label,
  value,
  check,
  onClick,
  edit = false,
  swatch,
  children,
}: {
  label: string;
  // What is filed; an empty row that opens reads "Add".
  value?: string | null;
  // A 16px circle of what is filed, ahead of its name (the Colour and Print rows, canvas 3b).
  swatch?: ReactNode;
  // Robes' read here is a guess she should look at: the rose "Check" mark, with its reason.
  check?: string | undefined;
  // No handler means the row is a fact, not a door: no chevron, nothing to press.
  onClick?: () => void;
  // A field she types (Name, Price, Notes): ✎ in place of ›.
  edit?: boolean;
  // A longer answer (a note) sits under the row's own line.
  children?: ReactNode;
}) {
  const filled = Boolean(value);
  const body = (
    <>
      {/* The label never gives way: the value yields its width and ends in an ellipsis. */}
      <span className="flex min-h-12 min-w-0 items-center gap-3">
        <span className="shrink-0 whitespace-nowrap font-medium font-sans text-[10px] text-ink-faint uppercase tracking-[0.2em]">
          {label}
        </span>
        {check ? (
          <span className="shrink-0 font-sans text-accent-warm text-xs" title={check}>
            {copy.check}
            <span className="sr-only">{`: ${check}`}</span>
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {filled ? swatch : null}
          <span
            className={`min-w-0 truncate font-sans text-[14px] ${
              filled ? 'text-ink-faint' : 'font-medium text-ink-muted'
            }`}
          >
            {value || (onClick ? copy.add : '')}
          </span>
        </span>
        {onClick ? (
          <Icon name={edit ? 'pencil' : 'forward'} size={14} className="shrink-0 text-ink-faint" />
        ) : null}
      </span>
      {children}
    </>
  );
  const shell = 'flex flex-col px-4 text-left';
  if (!onClick) return <div className={shell}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${shell} hover:bg-bg focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-focus-ring`}
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
  // The four seasons (D12) where the record carries them; none filed reads Year round.
  seasons?: readonly Season[];
  // A wish's retailer (PRD rev 3 §7.3), where an owned piece has its brand.
  sourceLabel?: string | null;
  colourCheck?: boolean;
  materialCheck?: boolean;
  brandCheck?: boolean;
};

// The page's tabs (PRD rev 3 §7.3): which of the record's rows show.
export type RecordTab = 'piece' | 'colour' | 'wearing';

// "Spring · Autumn", or Year round when none is filed (the band stands in for older rows).
export function seasonsLine(v: Pick<RecordValues, 'seasons' | 'seasonBand'>): string {
  if (v.seasons?.length) return v.seasons.map((x) => filterCopy.seasons[x]).join(' · ');
  if (v.seasonBand) return wardrobe.filter.seasons[v.seasonBand];
  return filterCopy.seasons.year_round;
}

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
  only,
  wish = false,
  wearing,
}: {
  values: RecordValues;
  onField: (field: PieceField) => void;
  onName?: (label: string) => void;
  withName?: boolean;
  reading?: boolean;
  // One tab's rows alone, in one box without an eyebrow (the piece page's PIECE · COLOUR ·
  // WEARING, PRD rev 3 §7.3): the Name row leads PIECE, Size · Price · Notes close it.
  only?: RecordTab;
  // A wish (§7.3): Brand and Shop (the retailer); its Seasons and Wear it for wait for their data.
  wish?: boolean;
  // The WEARING tab's own rows (Worn, In looks), ahead of Seasons and Wear it for.
  wearing?: ReactNode;
}) {
  const mainShade = shade(values.colourShade);
  const extraShades = values.colourExtra.flatMap((x) => {
    const found = shade(x);
    return found ? [found] : [];
  });
  const extras = extraShades.map((x) => x.name).join(' · ');
  const print = pattern(values.print);
  const v = (value: string | null | undefined) => (reading ? wardrobe.add.review.reading : value);
  const open = (field: PieceField) => (reading ? undefined : () => onField(field));
  const brandRow = wish ? (
    // A wish keeps its brand and adds the shop it's from (Annie, 9 Nov; canvas 3b draws Shop).
    <>
      <PieceRow label={copy.brand} value={v(values.brand)} onClick={open('brand')} />
      <PieceRow label={copy.rows.shop} value={v(values.sourceLabel)} onClick={open('shop')} />
    </>
  ) : (
    <PieceRow
      label={copy.brand}
      value={v(values.brand)}
      check={values.brandCheck && !reading ? copy.brandCheck : undefined}
      onClick={open('brand')}
    />
  );
  const sizeRow = <PieceRow label={copy.rows.size} value={v(values.size)} onClick={open('size')} />;
  const priceRow = (
    <PieceRow
      label={copy.rows.price}
      value={v(money(values.price, values.currency))}
      onClick={open('price')}
      edit
    />
  );
  // A filled note prints beneath, and the row's own value says the door is to change it.
  const notesRow = (
    <PieceRow
      label={copy.rows.notes}
      value={v(values.notes ? fields.edit : null)}
      onClick={open('notes')}
      edit
    >
      {values.notes && !reading ? (
        <Text size="small" tone="muted" italic className="pr-6 pb-3">
          {values.notes}
        </Text>
      ) : null}
    </PieceRow>
  );
  // The canvas's COLOUR tab (3b): four rows, each a door to its picker; the main colour and the
  // print show their swatch beside the name.
  const colourRows = (
    <>
      <PieceRow
        label={copy.rows.colour}
        value={v(mainShade?.name ?? null)}
        swatch={mainShade && !reading ? <ShadeSwatch shade={mainShade} size={16} /> : null}
        check={values.colourCheck && !reading ? wardrobe.colour.check : undefined}
        onClick={open('colour')}
      />
      <PieceRow label={copy.rows.extra} value={v(extras)} onClick={open('extra')} />
      <PieceRow
        label={copy.rows.print}
        value={v(print?.name ?? null)}
        swatch={print && !reading ? <PatternSwatch pattern={print} size={16} round /> : null}
        onClick={open('print')}
      />
      <PieceRow
        label={copy.rows.material}
        value={v(material(values.material)?.name ?? null)}
        check={values.materialCheck && !reading ? wardrobe.material.check : undefined}
        onClick={open('material')}
      />
    </>
  );
  // A wish's Seasons and Wear it for stand in the design but wait for their data (Annie, 9 Nov:
  // the fields are drawn, not yet filed), so on a wish they are facts, not doors.
  const wearOpen = (field: PieceField) => (wish ? undefined : open(field));
  const wearingRows = (
    <>
      <PieceRow
        label={copy.rows.season}
        value={v(seasonsLine(values))}
        onClick={wearOpen('season')}
      />
      <PieceRow
        label={copy.rows.wearFor}
        value={v(values.wearFor.join(' · ') || (wish ? copy.none : null))}
        onClick={wearOpen('wearFor')}
      />
    </>
  );
  if (only === 'piece') {
    return (
      <PieceSection>
        <PieceRow label={copy.label} value={v(values.label)} onClick={open('label')} edit />
        <PieceRow
          label={copy.rows.category}
          value={v(categoryLeaf(values))}
          onClick={open('category')}
        />
        {brandRow}
        {sizeRow}
        {priceRow}
        {notesRow}
      </PieceSection>
    );
  }
  if (only === 'colour') return <PieceSection>{colourRows}</PieceSection>;
  if (only === 'wearing') {
    return (
      <PieceSection>
        {wearing}
        {wearingRows}
      </PieceSection>
    );
  }
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
          <PieceRow label={copy.label} value={v(values.label)} onClick={open('label')} edit />
        ) : null}
        <PieceRow
          label={copy.rows.category}
          value={v(categoryLeaf(values))}
          onClick={open('category')}
        />
        {brandRow}
      </PieceSection>

      <PieceSection title={copy.sections.colour}>{colourRows}</PieceSection>

      <PieceSection title={copy.sections.wearing}>{wearingRows}</PieceSection>

      <PieceSection title={copy.sections.fit}>
        {sizeRow}
        {priceRow}
        {notesRow}
      </PieceSection>
    </div>
  );
}
