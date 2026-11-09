import type { PieceValues, Season } from '@robes/contracts';
import { filters as filterCopy, wardrobe } from '@robes/copy';
import { pattern, shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { suggestPieceName } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import { Eyebrow, fonts, maxFontSizeMultiplier, Text, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { PrintSwatch, ShadeSwatch } from './ColourField';
import type { PieceField } from './PieceFieldSheet';

const copy = wardrobe.piece;
const fields = wardrobe.fields;

// One piece anatomy (legacy Piece_Sheet 01): every fact is a row under a named section, and a
// tap opens that one field's drawer. Nothing on the record is a form. Resting rows sit on white with
// a hairline; the warm edge means selected, and no row is selected. Web twin: piece-rows.tsx.
export function PieceSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      {title ? <Eyebrow>{title}</Eyebrow> : null}
      <View className="overflow-hidden rounded-crisp border border-hairline bg-surface-raised">
        {children}
      </View>
    </View>
  );
}

export function PieceRow({
  label,
  value,
  hint,
  spoken,
  swatch,
  check,
  onPress,
  note,
  first = false,
}: {
  label: string;
  // What is filed, in ink.
  value?: string | null;
  // What an empty row offers instead, in the faint ink ("e.g. Toteme", "Choose", "Optional").
  hint?: string;
  // What a reader hears for the value when the row shows something else (a note's "Edit").
  spoken?: string | null;
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
      {/* The label never gives way (it wrapped a letter a line beside a long category): the
          value yields its width and ends in an ellipsis. */}
      <View className="min-h-6 flex-row items-center gap-3">
        <Text size="small" numberOfLines={1} style={{ flexShrink: 0 }}>
          {label}
        </Text>
        {check ? (
          <Text size="caption" className="text-accent-warm" style={{ flexShrink: 0 }}>
            {copy.check}
          </Text>
        ) : null}
        <View className="min-w-0 flex-1 flex-row items-center justify-end gap-2">
          {swatch}
          <Text
            size="small"
            tone={value ? 'ink' : 'faint'}
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-right"
            style={{ flexShrink: 1, minWidth: 0 }}
          >
            {value || (onPress ? (hint ?? fields.hints.optional) : '')}
          </Text>
        </View>
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
  const heard = spoken ?? value;
  // The row says what it holds as well as what it is, so a reader hears the whole fact.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${heard || copy.add}${check ? `. ${check}` : ''}`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

// The Name row as a field she types in place (redline 06): a drawer for one line of text is a
// detour. The placeholder offers Robes' name from the colour and category, never applies it.
function NameRow({
  value,
  offer,
  onChange,
}: {
  value: string;
  offer: string | null;
  onChange: (label: string) => void;
}) {
  return (
    <View className="min-h-12 flex-row items-center gap-3 px-4">
      <Text size="small" numberOfLines={1} style={{ flexShrink: 0 }}>
        {copy.label}
      </Text>
      <TextInput
        accessibilityLabel={copy.label}
        value={value}
        maxLength={120}
        autoCorrect={false}
        placeholder={offer ?? fields.name.placeholder}
        placeholderTextColorClassName="accent-ink-faint"
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        onChangeText={onChange}
        className="min-h-11 min-w-0 flex-1 text-right text-sm text-ink"
        style={{ fontFamily: fonts.sans }}
      />
    </View>
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
// Web twin: RecordRows in piece-rows.tsx.
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
  // A wish (§7.3): Shop (the retailer) where an owned piece has its brand.
  wish?: boolean;
  // The WEARING tab's own rows (Worn, In looks), ahead of Seasons and Wear it for.
  wearing?: ReactNode;
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
  const brandRow = wish ? (
    <PieceRow
      label={copy.rows.shop}
      value={v(values.sourceLabel)}
      hint={fields.hints.brand}
      onPress={open('shop')}
    />
  ) : (
    <PieceRow
      label={copy.brand}
      value={v(values.brand)}
      hint={fields.hints.brand}
      check={values.brandCheck && !reading ? copy.brandCheck : undefined}
      onPress={open('brand')}
    />
  );
  const sizeRow = <PieceRow label={copy.rows.size} value={v(values.size)} onPress={open('size')} />;
  const priceRow = (
    <PieceRow
      label={copy.rows.price}
      value={v(money(values.price, values.currency))}
      onPress={open('price')}
    />
  );
  // A filled note prints beneath, and the row's own value says the door is to change it.
  const notesRow = (
    <PieceRow
      label={copy.rows.notes}
      value={v(values.notes ? fields.edit : null)}
      spoken={reading ? null : values.notes}
      note={reading ? null : values.notes}
      onPress={open('notes')}
    />
  );
  const colourRows = (
    <>
      <PieceRow
        first
        label={copy.rows.colour}
        value={v(mainShade?.name ?? null)}
        swatch={mainShade && !reading ? <ShadeSwatch shade={mainShade} size={18} /> : undefined}
        check={values.colourCheck && !reading ? wardrobe.colour.check : undefined}
        onPress={open('colour')}
      />
      <PieceRow
        label={copy.rows.extra}
        value={v(extras)}
        swatch={
          extraShades.length && !reading ? (
            <View className="flex-row items-center gap-1">
              {extraShades.map((x) => (
                <ShadeSwatch key={x.id} shade={x} size={18} />
              ))}
            </View>
          ) : undefined
        }
        onPress={open('extra')}
      />
      <PieceRow
        label={copy.rows.print}
        value={v(print?.name ?? wardrobe.colour.plain)}
        swatch={print && !reading ? <PrintSwatch id={print.id} size={18} /> : undefined}
        onPress={open('print')}
      />
      <PieceRow
        label={copy.rows.material}
        value={v(material(values.material)?.name ?? null)}
        check={values.materialCheck && !reading ? wardrobe.material.check : undefined}
        onPress={open('material')}
      />
    </>
  );
  const wearingRows = (
    <>
      <PieceRow
        first={!wearing}
        label={copy.rows.season}
        value={v(seasonsLine(values))}
        onPress={open('season')}
      />
      <PieceRow
        label={copy.rows.wearFor}
        value={v(values.wearFor.join(' · '))}
        onPress={open('wearFor')}
      />
    </>
  );
  if (only === 'piece') {
    return (
      <PieceSection>
        <PieceRow first label={copy.label} value={v(values.label)} onPress={open('label')} />
        <PieceRow
          label={copy.rows.category}
          value={v(categoryLeaf(values))}
          hint={fields.hints.category}
          onPress={open('category')}
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
    <View className="gap-5">
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
          <PieceRow first label={copy.label} value={v(values.label)} onPress={open('label')} />
        ) : null}
        <PieceRow
          first={!withName}
          label={copy.rows.category}
          value={v(categoryLeaf(values))}
          hint={fields.hints.category}
          onPress={open('category')}
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
    </View>
  );
}
