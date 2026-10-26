import { type PieceValues, SeasonBand, type UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import type { PieceColour } from '@robes/core/colour';
import {
  itemTypesOf,
  resolveTaxonomy,
  sheetCategories,
  sheetL1For,
  subcategoriesOf,
  WEAR_SEEDS,
} from '@robes/core/taxonomy';
import { Button, Field, Pill, Sheet, Text } from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ColourPicker, PrintPicker } from './ColourField';
import { MaterialPicker } from './MaterialField';

const copy = wardrobe.piece;

// Every field she can change on the record, each opening the one drawer below.
export type PieceField =
  | 'label'
  | 'brand'
  | 'colour'
  | 'extra'
  | 'print'
  | 'material'
  | 'category'
  | 'season'
  | 'wearFor'
  | 'size'
  | 'price'
  | 'notes';

const TITLES: Record<PieceField, string> = {
  category: copy.rows.category,
  label: copy.label,
  brand: copy.brand,
  colour: copy.rows.colour,
  extra: copy.rows.extra,
  print: copy.rows.print,
  material: wardrobe.material.title,
  season: copy.rows.season,
  wearFor: copy.rows.wearFor,
  size: copy.rows.size,
  price: copy.rows.price,
  notes: copy.rows.notes,
};

const colourOf = (p: PieceValues): PieceColour => ({
  colourShade: p.colourShade,
  colourExtra: p.colourExtra,
  print: p.print,
});

const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);

// One drawer per field (legacy __psOpen): it opens on what is filed, and Save is the only write.
// A colour, a print and a season answer on the tap — picking IS the answer, so no second step.
export function PieceFieldSheet({
  piece,
  field,
  onClose,
  onSave,
  saving,
}: {
  piece: PieceValues;
  field: PieceField | null;
  onClose: () => void;
  onSave: (input: UpdatePieceInput) => void;
  saving: boolean;
}) {
  const [text, setText] = useState('');
  const [colour, setColour] = useState<PieceColour>(() => colourOf(piece));

  // The drawer opens on what is filed now, whichever field she tapped.
  useEffect(() => {
    if (!field) return;
    setColour(colourOf(piece));
    setText(
      field === 'label'
        ? piece.label
        : field === 'brand'
          ? (piece.brand ?? '')
          : field === 'size'
            ? (piece.size ?? '')
            : field === 'price'
              ? piece.price === null
                ? ''
                : String(piece.price)
              : field === 'notes'
                ? (piece.notes ?? '')
                : '',
    );
  }, [field, piece]);

  const commit = (input: UpdatePieceInput) => {
    onSave(input);
    onClose();
  };

  const saveText = () => {
    if (!field) return;
    if (field === 'label') {
      if (!text.trim()) return;
      commit({ label: text.trim() });
    } else if (field === 'brand') commit({ brand: orNull(text) });
    else if (field === 'size') commit({ size: orNull(text) });
    else if (field === 'price') {
      const n = Number(text.trim());
      commit({ price: text.trim() && Number.isFinite(n) && n >= 0 ? n : null });
    } else if (field === 'notes') commit({ notes: orNull(text) });
  };

  const picks =
    field === 'colour' ||
    field === 'extra' ||
    field === 'print' ||
    field === 'season' ||
    field === 'wearFor' ||
    field === 'category';

  return (
    <Sheet open={field !== null} onClose={onClose} title={field ? TITLES[field] : ''}>
      <View className="gap-4 pb-6">
        {field === 'wearFor' ? (
          <WearForPicker piece={piece} onPick={onSave} />
        ) : field === 'category' ? (
          <CategoryPicker piece={piece} onPick={commit} />
        ) : field === 'season' ? (
          <View className="flex-row flex-wrap gap-2">
            {SeasonBand.options.map((band) => (
              <Pill
                key={band}
                selected={piece.seasonBand === band}
                onPress={() => commit({ seasonBand: band })}
              >
                {wardrobe.filter.seasons[band]}
              </Pill>
            ))}
          </View>
        ) : field === 'material' ? (
          <MaterialPicker value={piece.material} onChange={(material) => commit({ material })} />
        ) : field === 'print' ? (
          <PrintPicker
            value={colour}
            onChange={(next) => {
              setColour(next);
              onSave({ print: next.print });
            }}
          />
        ) : field === 'colour' || field === 'extra' ? (
          <>
            {field === 'extra' ? (
              <Text size="small" tone="muted">
                {copy.extraHint}
              </Text>
            ) : null}
            <ColourPicker
              value={colour}
              slot={field === 'extra' ? 'extra' : 'main'}
              onChange={(next) => {
                setColour(next);
                onSave({ colourShade: next.colourShade, colourExtra: next.colourExtra });
              }}
            />
          </>
        ) : field ? (
          <Field
            label={TITLES[field]}
            value={text}
            onChangeText={setText}
            multiline={field === 'notes'}
            keyboardType={field === 'price' ? 'decimal-pad' : 'default'}
            maxLength={
              field === 'notes' ? 1000 : field === 'label' ? 120 : field === 'brand' ? 80 : 40
            }
          />
        ) : null}
        {/* A material is answered by the pick itself, and "Not sure" sits inside the picker. */}
        {field === 'material' ? null : picks ? (
          <Button variant="quiet" onPress={onClose}>
            {copy.done}
          </Button>
        ) : (
          <Button loading={saving} disabled={field === 'label' && !text.trim()} onPress={saveText}>
            {copy.saveField}
          </Button>
        )}
      </View>
    </Sheet>
  );
}

// Category › Subcategory › Item type (wardrobe_taxonomy): the drill stops wherever she does —
// a subcategory alone is a complete answer. The web twin is components/wardrobe/piece-field-sheet.
function CategoryPicker({
  piece,
  onPick,
}: {
  piece: PieceValues;
  onPick: (input: UpdatePieceInput) => void;
}) {
  const [sheetL1, setSheetL1] = useState<string | null>(
    () => (piece.categoryL2 ? sheetL1For(piece.categoryL2) : null) ?? null,
  );
  const [l2, setL2] = useState<string | null>(piece.categoryL2);

  const commit = (nextL2: string, nextL3: string | null) => {
    const resolved = resolveTaxonomy(nextL2, nextL3);
    if (resolved) onPick({ categoryL2: resolved.categoryL2, categoryL3: resolved.categoryL3 });
  };

  if (l2) {
    return (
      <View className="gap-3">
        <Button variant="quiet" className="self-start" onPress={() => setL2(null)}>
          {`‹ ${sheetL1 ?? copy.rows.category}`}
        </Button>
        <View className="flex-row flex-wrap gap-2">
          <Pill selected={piece.categoryL3 === null} onPress={() => commit(l2, null)}>
            {copy.taxonomy.justThis(l2)}
          </Pill>
          {itemTypesOf(l2).map((l3) => (
            <Pill key={l3} selected={piece.categoryL3 === l3} onPress={() => commit(l2, l3)}>
              {l3}
            </Pill>
          ))}
        </View>
      </View>
    );
  }
  if (sheetL1) {
    return (
      <View className="gap-3">
        <Button variant="quiet" className="self-start" onPress={() => setSheetL1(null)}>
          {`‹ ${copy.rows.category}`}
        </Button>
        <View className="flex-row flex-wrap gap-2">
          {subcategoriesOf(sheetL1).map((sub) => (
            <Pill key={sub} selected={piece.categoryL2 === sub} onPress={() => setL2(sub)}>
              {sub}
            </Pill>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {sheetCategories().map((cat) => (
        <Pill
          key={cat}
          selected={piece.categoryL2 !== null && sheetL1For(piece.categoryL2) === cat}
          onPress={() => setSheetL1(cat)}
        >
          {cat}
        </Pill>
      ))}
    </View>
  );
}

// What she wears it for: the seven seeds plus anything she has added, multi-select. Each tap is
// the answer. The web twin is components/wardrobe/piece-field-sheet.tsx.
function WearForPicker({
  piece,
  onPick,
}: {
  piece: PieceValues;
  onPick: (input: UpdatePieceInput) => void;
}) {
  const [own, setOwn] = useState('');
  const chosen = piece.wearFor;
  const options = [
    ...WEAR_SEEDS.map((s) => s.label),
    ...chosen.filter((c) => !WEAR_SEEDS.some((s) => s.label === c)),
  ];
  const toggle = (label: string) =>
    onPick({
      wearFor: chosen.includes(label) ? chosen.filter((c) => c !== label) : [...chosen, label],
    });
  const add = () => {
    const label = own.trim();
    if (!label || chosen.includes(label)) return;
    setOwn('');
    onPick({ wearFor: [...chosen, label] });
  };
  return (
    <View className="gap-4">
      <Text size="small" tone="muted">
        {copy.wearForHint}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((label) => (
          <Pill key={label} selected={chosen.includes(label)} onPress={() => toggle(label)}>
            {label}
          </Pill>
        ))}
      </View>
      <Field
        label={copy.addWearFor}
        value={own}
        onChangeText={setOwn}
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={add}
      />
      <Button variant="secondary" disabled={!own.trim()} onPress={add}>
        {copy.add}
      </Button>
    </View>
  );
}
