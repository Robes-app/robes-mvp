import type { PieceValues, Season } from '@robes/contracts';
import { filters as filterCopy, wardrobe } from '@robes/copy';
import { pattern, shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { suggestPieceName } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import { Eyebrow, fonts, maxFontSizeMultiplier, Text, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { PieceField } from './PieceFieldSheet';

const copy = wardrobe.piece;
const fields = wardrobe.fields;

// One piece anatomy (legacy Piece_Sheet 01; drawn as the Front Door canvas 3b, PRD §7.3): every
// fact is a row in one white card, a small-caps label at the left and the value at the right
// ("Add" while nothing is filed), then › for a row that opens a picker or ✎ for one she types.
// Nothing on the record is a form. Web twin: piece-rows.tsx.
export function PieceSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      {title ? <Eyebrow>{title}</Eyebrow> : null}
      <View className="overflow-hidden rounded-[12px] border border-rule-mid bg-surface-raised">
        {children}
      </View>
    </View>
  );
}

export function PieceRow({
  label,
  value,
  spoken,
  check,
  onPress,
  edit = false,
  note,
  first = false,
}: {
  label: string;
  // What is filed; an empty row that opens reads "Add".
  value?: string | null;
  // What a reader hears for the value when the row shows something else (a note's "Edit").
  spoken?: string | null;
  // Robes' read here is a guess she should look at: the rose "Check" mark, with its reason.
  check?: string | undefined;
  // No handler means the row is a fact, not a door: no chevron, nothing to press.
  onPress?: () => void;
  // A field she types (Name, Price, Notes): ✎ in place of ›.
  edit?: boolean;
  note?: string | null;
  first?: boolean;
}) {
  const faint = useColor('ink-faint');
  const empty = !value;
  const body = (
    <View className={`gap-1 px-4 ${first ? '' : 'border-hairline border-t'}`}>
      {/* The label never gives way: the value yields its width and ends in an ellipsis. */}
      <View className="min-h-12 flex-row items-center gap-3">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink-faint uppercase"
          style={{ flexShrink: 0, fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 2 }}
        >
          {label}
        </Text>
        {check ? (
          <Text size="caption" className="text-accent-warm" style={{ flexShrink: 0 }}>
            {copy.check}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`min-w-0 flex-1 text-right ${empty ? 'text-ink-muted' : 'text-ink-faint'}`}
          style={{ fontFamily: empty ? fonts.sansMedium : fonts.sans, fontSize: 14 }}
        >
          {value || (onPress ? copy.add : '')}
        </Text>
        {onPress ? <Icon name={edit ? 'pencil' : 'forward'} size={14} color={faint} /> : null}
      </View>
      {note ? (
        <Text size="caption" tone="muted" italic className="pb-3">
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
  // A wish's retailer (PRD rev 3 §7.3), beside its brand.
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
      <PieceRow label={copy.brand} value={v(values.brand)} onPress={open('brand')} />
      <PieceRow label={copy.rows.shop} value={v(values.sourceLabel)} onPress={open('shop')} />
    </>
  ) : (
    <PieceRow
      label={copy.brand}
      value={v(values.brand)}
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
      edit
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
      edit
    />
  );
  // The canvas's COLOUR tab (3b): four rows of words, each a door to its picker.
  const colourRows = (
    <>
      <PieceRow
        first
        label={copy.rows.colour}
        value={v(mainShade?.name ?? null)}
        check={values.colourCheck && !reading ? wardrobe.colour.check : undefined}
        onPress={open('colour')}
      />
      <PieceRow label={copy.rows.extra} value={v(extras)} onPress={open('extra')} />
      <PieceRow label={copy.rows.print} value={v(print?.name ?? null)} onPress={open('print')} />
      <PieceRow
        label={copy.rows.material}
        value={v(material(values.material)?.name ?? null)}
        check={values.materialCheck && !reading ? wardrobe.material.check : undefined}
        onPress={open('material')}
      />
    </>
  );
  // A wish's Seasons and Wear it for stand in the design but wait for their data (Annie, 9 Nov:
  // the fields are drawn, not yet filed), so on a wish they are facts, not doors.
  const wearOpen = (field: PieceField) => (wish ? undefined : open(field));
  const wearingRows = (
    <>
      <PieceRow
        first={!wearing}
        label={copy.rows.season}
        value={v(seasonsLine(values))}
        onPress={wearOpen('season')}
      />
      <PieceRow
        label={copy.rows.wearFor}
        value={v(values.wearFor.join(' · ') || (wish ? copy.none : null))}
        onPress={wearOpen('wearFor')}
      />
    </>
  );
  if (only === 'piece') {
    return (
      <PieceSection>
        <PieceRow first label={copy.label} value={v(values.label)} onPress={open('label')} edit />
        <PieceRow
          label={copy.rows.category}
          value={v(categoryLeaf(values))}
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
          <PieceRow first label={copy.label} value={v(values.label)} onPress={open('label')} edit />
        ) : null}
        <PieceRow
          first={!withName}
          label={copy.rows.category}
          value={v(categoryLeaf(values))}
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
