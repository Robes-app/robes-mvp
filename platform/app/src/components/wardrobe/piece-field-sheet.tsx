'use client';

import { type Piece, SeasonBand, type UpdatePieceInput } from '@robes/contracts';
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
import { Button, Field, Pill, Sheet, Text, TextArea } from '@robes/ui';
import { type FormEvent, useEffect, useState } from 'react';
import { ColourPicker, PrintPicker } from './colour-field';
import { MaterialPicker } from './material-field';

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

const colourOf = (p: Piece): PieceColour => ({
  colourShade: p.colourShade,
  colourExtra: p.colourExtra,
  print: p.print,
});

const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);

// One drawer per field (legacy __psOpen): it opens on what is filed, and Save is the only write.
// A colour commits on the tap — picking a shade IS the answer, so it needs no second step.
export function PieceFieldSheet({
  piece,
  field,
  onClose,
  onSave,
  saving,
}: {
  piece: Piece;
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

  if (!field) return null;

  const commit = (input: UpdatePieceInput) => {
    onSave(input);
    onClose();
  };

  const saveText = () => {
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

  // A colour, a print and a season answer on the tap; the rest are hers to type, then save.
  const picks =
    field === 'colour' ||
    field === 'extra' ||
    field === 'print' ||
    field === 'season' ||
    field === 'wearFor' ||
    field === 'category';

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={TITLES[field]}
      footer={
        // A material is answered by the pick itself, and "Not sure" sits inside the picker.
        field === 'material' ? undefined : picks ? (
          <Button variant="quiet" onClick={onClose}>
            {copy.done}
          </Button>
        ) : (
          <Button
            variant="primary"
            block
            loading={saving}
            disabled={field === 'label' && !text.trim()}
            onClick={saveText}
          >
            {copy.saveField}
          </Button>
        )
      }
    >
      {field === 'wearFor' ? (
        <WearForPicker piece={piece} onPick={onSave} />
      ) : field === 'category' ? (
        <CategoryPicker piece={piece} onPick={commit} />
      ) : field === 'notes' ? (
        <TextArea
          label={TITLES[field]}
          labelHidden
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : field === 'price' ? (
        <Field
          label={TITLES[field]}
          labelHidden
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : field === 'label' || field === 'brand' || field === 'size' ? (
        <Field
          label={TITLES[field]}
          labelHidden
          maxLength={field === 'label' ? 120 : field === 'brand' ? 80 : 40}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : field === 'season' ? (
        <ul className="flex flex-wrap gap-2">
          {SeasonBand.options.map((band) => (
            <li key={band}>
              <Pill
                selected={piece.seasonBand === band}
                onClick={() => commit({ seasonBand: band })}
              >
                {wardrobe.filter.seasons[band]}
              </Pill>
            </li>
          ))}
        </ul>
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
      ) : (
        <div className="flex flex-col gap-3">
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
        </div>
      )}
    </Sheet>
  );
}

// Category › Subcategory › Item type (wardrobe_taxonomy): the drill stops wherever she does —
// a subcategory alone is a complete answer, so "Just trousers" commits without an item type.
function CategoryPicker({
  piece,
  onPick,
}: {
  piece: Piece;
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
      <div className="flex flex-col gap-3">
        <Button variant="quiet" className="self-start" onClick={() => setL2(null)}>
          {`‹ ${sheetL1 ?? copy.rows.category}`}
        </Button>
        <ul className="flex flex-wrap gap-2">
          <li>
            <Pill selected={piece.categoryL3 === null} onClick={() => commit(l2, null)}>
              {copy.taxonomy.justThis(l2)}
            </Pill>
          </li>
          {itemTypesOf(l2).map((l3) => (
            <li key={l3}>
              <Pill selected={piece.categoryL3 === l3} onClick={() => commit(l2, l3)}>
                {l3}
              </Pill>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (sheetL1) {
    return (
      <div className="flex flex-col gap-3">
        <Button variant="quiet" className="self-start" onClick={() => setSheetL1(null)}>
          {`‹ ${copy.rows.category}`}
        </Button>
        <ul className="flex flex-wrap gap-2">
          {subcategoriesOf(sheetL1).map((sub) => (
            <li key={sub}>
              <Pill selected={piece.categoryL2 === sub} onClick={() => setL2(sub)}>
                {sub}
              </Pill>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {sheetCategories().map((cat) => (
        <li key={cat}>
          <Pill
            selected={piece.categoryL2 !== null && sheetL1For(piece.categoryL2) === cat}
            onClick={() => setSheetL1(cat)}
          >
            {cat}
          </Pill>
        </li>
      ))}
    </ul>
  );
}

// What she wears it for: the seven seeds plus anything she has added, multi-select. Each tap is
// the answer, so the drawer writes as she goes.
function WearForPicker({
  piece,
  onPick,
}: {
  piece: Piece;
  onPick: (input: UpdatePieceInput) => void;
}) {
  const [own, setOwn] = useState('');
  const chosen = piece.wearFor;
  // Her own tags sit after the seeds, in the order she made them.
  const options = [
    ...WEAR_SEEDS.map((s) => s.label),
    ...chosen.filter((c) => !WEAR_SEEDS.some((s) => s.label === c)),
  ];
  const toggle = (label: string) =>
    onPick({
      wearFor: chosen.includes(label) ? chosen.filter((c) => c !== label) : [...chosen, label],
    });
  const add = (e: FormEvent) => {
    e.preventDefault();
    const label = own.trim();
    if (!label || chosen.includes(label)) return;
    setOwn('');
    onPick({ wearFor: [...chosen, label] });
  };
  return (
    <div className="flex flex-col gap-4">
      <Text size="small" tone="muted">
        {copy.wearForHint}
      </Text>
      <ul className="flex flex-wrap gap-2">
        {options.map((label) => (
          <li key={label}>
            <Pill selected={chosen.includes(label)} onClick={() => toggle(label)}>
              {label}
            </Pill>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex items-end gap-2">
        <Field
          label={copy.addWearFor}
          value={own}
          maxLength={40}
          onChange={(e) => setOwn(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={!own.trim()}>
          {copy.add}
        </Button>
      </form>
    </div>
  );
}
