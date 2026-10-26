import type { PieceValues } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { pattern, shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { Icon } from '@robes/icons/native';
import { Eyebrow, Text, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ShadeSwatch } from './ColourField';
import type { PieceField } from './PieceFieldSheet';

const copy = wardrobe.piece;

// One piece anatomy (legacy Piece_Sheet 01): every fact is a row under a named section, and a
// tap opens that one field's drawer. Nothing on the record is a form. Web twin: piece-rows.tsx.
export function PieceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Eyebrow>{title}</Eyebrow>
      <View className="overflow-hidden rounded-crisp border border-hairline bg-surface">
        {children}
      </View>
    </View>
  );
}

export function PieceRow({
  label,
  value,
  swatch,
  check,
  onPress,
  note,
  first = false,
}: {
  label: string;
  value?: string | null;
  swatch?: ReactNode;
  // Robes' read here is a guess she should look at: the rose "Check" mark, with its reason.
  check?: string | undefined;
  // No handler means the row is a fact, not a door: no chevron, nothing to press.
  onPress?: () => void;
  note?: string | null;
  first?: boolean;
}) {
  const faint = useColor('ink-faint');
  const body = (
    <View className={`gap-1 px-4 py-3 ${first ? '' : 'border-hairline border-t'}`}>
      <View className="flex-row items-center gap-3">
        <Text size="small" className="flex-1">
          {label}
        </Text>
        {check ? (
          <Text size="caption" className="text-accent-warm">
            {copy.check}
          </Text>
        ) : null}
        {swatch}
        <Text size="small" tone={value ? 'muted' : 'faint'} numberOfLines={1}>
          {value || (onPress ? copy.add : '')}
        </Text>
        {onPress ? <Icon name="forward" size={15} color={faint} /> : null}
      </View>
      {note ? (
        <Text size="caption" tone="muted" italic>
          {note}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  // The row says what it holds as well as what it is, so a reader hears the whole fact.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || copy.add}${check ? `. ${check}` : ''}`}
      onPress={onPress}
    >
      {body}
    </Pressable>
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
// Web twin: RecordRows in piece-rows.tsx.
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
          <PieceRow first label={copy.label} value={v(values.label)} onPress={open('label')} />
        ) : null}
        <PieceRow
          first={!withName}
          label={copy.rows.category}
          value={v(
            [values.categoryL2 ?? values.category, values.categoryL3].filter(Boolean).join(' · '),
          )}
          onPress={open('category')}
        />
        <PieceRow label={copy.brand} value={v(values.brand)} onPress={open('brand')} />
      </PieceSection>

      <PieceSection title={copy.sections.colour}>
        <PieceRow
          first
          label={copy.rows.colour}
          value={v(mainShade?.name ?? null)}
          swatch={mainShade && !reading ? <ShadeSwatch shade={mainShade} size={18} /> : undefined}
          check={values.colourCheck && !reading ? wardrobe.colour.check : undefined}
          onPress={open('colour')}
        />
        <PieceRow label={copy.rows.extra} value={v(extras)} onPress={open('extra')} />
        <PieceRow
          label={copy.rows.print}
          value={v(pattern(values.print)?.name ?? wardrobe.colour.plain)}
          onPress={open('print')}
        />
        <PieceRow
          label={copy.rows.material}
          value={v(material(values.material)?.name ?? null)}
          check={values.materialCheck && !reading ? wardrobe.material.check : undefined}
          onPress={open('material')}
        />
      </PieceSection>

      <PieceSection title={copy.sections.wearing}>
        <PieceRow
          first
          label={copy.rows.season}
          value={v(values.seasonBand ? wardrobe.filter.seasons[values.seasonBand] : null)}
          onPress={open('season')}
        />
        <PieceRow
          label={copy.rows.wearFor}
          value={v(values.wearFor.join(' · '))}
          onPress={open('wearFor')}
        />
      </PieceSection>

      <PieceSection title={copy.sections.fit}>
        <PieceRow first label={copy.rows.size} value={v(values.size)} onPress={open('size')} />
        <PieceRow
          label={copy.rows.price}
          value={v(money(values.price, values.currency))}
          onPress={open('price')}
        />
        <PieceRow
          label={copy.rows.notes}
          value={reading ? wardrobe.add.review.reading : undefined}
          note={reading ? null : values.notes}
          onPress={open('notes')}
        />
      </PieceSection>
    </>
  );
}
