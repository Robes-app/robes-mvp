'use client';

import type { PieceValues, Season, UpdatePieceInput } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import { type PieceColour, shade } from '@robes/core/colour';
import {
  convertUkSize,
  formatUkSize,
  parseUkSize,
  sizeSystemFor,
  stepUkSize,
  ukSizeBounds,
} from '@robes/core/sizes';
import {
  DETAIL_MAX,
  detailOf,
  itemTypesOf,
  resolveTaxonomy,
  sheetCategories,
  sheetL1For,
  subcategoriesOf,
} from '@robes/core/taxonomy';
import {
  currencyForLocale,
  PRICE_CURRENCIES,
  parsePriceInput,
  suggestPieceName,
} from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import {
  Button,
  Field,
  IconButton,
  OptionList,
  Pill,
  Sheet,
  Text,
  TextArea,
  OptionRow as ToggleRow,
} from '@robes/ui';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTagsPicker } from '@/components/tags/tags-picker';
import { ColourPicker, OptionRow, PrintPicker } from './colour-field';
import { MaterialPicker } from './material-field';

const copy = wardrobe.piece;
const fields = wardrobe.fields;

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
  | 'notes'
  // Its one defining detail, in her words (owned pieces only).
  | 'detail'
  // A wish's retailer (Front Door PRD rev 3 §7.3), where an owned piece has its brand.
  | 'shop';

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
  detail: copy.rows.detail,
  shop: copy.rows.shop,
};

// The drawers she types into: one field, a Save that waits for a change (redline "one
// single-field sheet").
const TYPED: ReadonlySet<PieceField> = new Set([
  'label',
  'brand',
  'size',
  'price',
  'notes',
  'detail',
  'shop',
]);

// The record the drawer opens on: the row values, and the category the piece files under (it
// decides the size scale).
export type FieldPiece = PieceValues & {
  category?: string | null;
  // The four seasons (D12), where the record carries them; none filed reads Year round.
  seasons?: readonly Season[];
  // A wish's retailer (§7.3).
  sourceLabel?: string | null;
  // An owned piece's defining detail.
  detail?: string | null;
};

// What a drawer writes: a piece's fields, and a wish's Shop (the retailer) on a wish's page.
export type FieldInput = UpdatePieceInput & { sourceLabel?: string | null };

const colourOf = (p: PieceValues): PieceColour => ({
  colourShade: p.colourShade,
  colourExtra: p.colourExtra,
  print: p.print,
});

const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);
const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
const seasonCopy = lookbook.savedLook.seasonsView;

const textOf = (field: PieceField, p: FieldPiece): string =>
  field === 'label'
    ? p.label
    : field === 'brand'
      ? (p.brand ?? '')
      : field === 'shop'
        ? (p.sourceLabel ?? '')
        : field === 'size'
          ? (p.size ?? '')
          : field === 'price'
            ? p.price === null
              ? ''
              : String(p.price)
            : field === 'notes'
              ? (p.notes ?? '')
              : field === 'detail'
                ? (p.detail ?? '')
                : '';

// Where the category drill opens: where the piece already sits.
type Drill = { sheetL1: string | null; l2: string | null };
const drillOf = (p: PieceValues): Drill => ({
  sheetL1: (p.categoryL2 ? sheetL1For(p.categoryL2) : null) ?? null,
  l2: p.categoryL2,
});

const symbolOf = (code: string): string =>
  PRICE_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;

// One drawer per field (legacy __psOpen): it opens on what is filed. A pick is the answer and
// closes it; a typed field saves once it has changed. Native twin:
// mobile/src/features/wardrobe/PieceFieldSheet.tsx.
export function PieceFieldSheet({
  piece,
  field,
  onClose,
  onSave,
  saving,
}: {
  piece: FieldPiece;
  field: PieceField | null;
  onClose: () => void;
  onSave: (input: FieldInput) => void;
  saving: boolean;
}) {
  const [text, setText] = useState('');
  const [colour, setColour] = useState<PieceColour>(() => colourOf(piece));
  const [currency, setCurrency] = useState<string>('EUR');
  const [uk, setUk] = useState<number | null>(null);
  const [drill, setDrill] = useState<Drill>(() => drillOf(piece));

  const system = sizeSystemFor(piece);
  // A size typed some other way ("M") stays hers as text, rather than being stepped over.
  const stepper =
    system !== 'plain' && (!piece.size || parseUkSize(system, piece.size) !== null) ? system : null;

  // The drawer opens on what is filed now, whichever field she tapped. Only on opening: callers
  // pass a fresh piece object each render, and a re-render must not wipe what she is typing.
  const opened = useRef<PieceField | null>(null);
  useEffect(() => {
    if (field === opened.current) return;
    opened.current = field;
    if (!field) return;
    setColour(colourOf(piece));
    setText(textOf(field, piece));
    setCurrency(piece.currency ?? currencyForLocale(navigator.language));
    setUk(parseUkSize(sizeSystemFor(piece), piece.size));
    setDrill(drillOf(piece));
  }, [field, piece]);

  if (!field) return null;

  const commit = (input: FieldInput) => {
    onSave(input);
    onClose();
  };

  // What Save would write, or null while nothing has changed (or the price isn't one).
  const pending = (): FieldInput | null => {
    if (field === 'label') {
      const label = text.trim();
      return label && label !== piece.label ? { label } : null;
    }
    if (field === 'brand') return orNull(text) === piece.brand ? null : { brand: orNull(text) };
    if (field === 'shop') {
      return orNull(text) === (piece.sourceLabel ?? null) ? null : { sourceLabel: orNull(text) };
    }
    if (field === 'notes') return orNull(text) === piece.notes ? null : { notes: orNull(text) };
    if (field === 'detail') {
      const detail = orNull(text);
      if (detail !== null && detailOf(detail) === null) return null;
      return detail === (piece.detail ?? null) ? null : { detail };
    }
    if (field === 'size') {
      const size = stepper ? (uk === null ? null : formatUkSize(uk)) : orNull(text);
      return size === piece.size ? null : { size };
    }
    if (field === 'price') {
      const price = parsePriceInput(text);
      if (text.trim() && price === null) return null;
      if (price === null) return piece.price === null ? null : { price: null };
      return price === piece.price && currency === piece.currency ? null : { price, currency };
    }
    return null;
  };
  const next = TYPED.has(field) ? pending() : null;
  const save = (e?: FormEvent) => {
    e?.preventDefault();
    if (next) commit(next);
  };

  const category = field === 'category' ? categoryHeader(drill) : null;

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={category?.title ?? TITLES[field]}
      {...(category?.eyebrow ? { eyebrow: category.eyebrow } : {})}
      {...(category?.back
        ? {
            leading: (
              <IconButton
                icon="back"
                label={fields.back(category.back.label)}
                onClick={() => setDrill(category.back?.to ?? { sheetL1: null, l2: null })}
              />
            ),
          }
        : {})}
      {...(field === 'wearFor' || field === 'season' ? { closeLabel: copy.done } : {})}
      footer={
        TYPED.has(field) ? (
          <Button variant="primary" block loading={saving} disabled={!next} onClick={() => save()}>
            {copy.saveField}
          </Button>
        ) : undefined
      }
    >
      {field === 'wearFor' ? (
        <PieceTags piece={piece} onPick={onSave} />
      ) : field === 'category' ? (
        <CategoryList piece={piece} drill={drill} onDrill={setDrill} onPick={commit} />
      ) : TYPED.has(field) ? (
        // Return saves, as the button does.
        <form onSubmit={save} className="flex flex-col gap-3">
          {field === 'notes' ? (
            <TextArea
              label={TITLES[field]}
              labelHidden
              autoFocus
              maxLength={1000}
              rows={4}
              placeholder={fields.notes.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              // Four lines to start, growing with her note to eight.
              className="field-sizing-content max-h-[13.5rem] min-h-[7.25rem] resize-none"
            />
          ) : field === 'price' ? (
            <PriceField text={text} onText={setText} currency={currency} onCurrency={setCurrency} />
          ) : field === 'size' && stepper ? (
            <SizeStepper
              system={stepper}
              uk={uk}
              onStep={(direction) => setUk(stepUkSize(stepper, uk, direction))}
            />
          ) : (
            <Field
              label={TITLES[field]}
              labelHidden
              autoFocus
              autoComplete="off"
              maxLength={
                field === 'label'
                  ? 120
                  : field === 'brand'
                    ? 80
                    : field === 'detail'
                      ? DETAIL_MAX
                      : 40
              }
              {...(field === 'detail' && text.trim() && detailOf(text) === null
                ? { error: fields.detail.invalid }
                : {})}
              placeholder={
                field === 'detail'
                  ? fields.detail.placeholder
                  : field === 'brand'
                    ? fields.brand.placeholder
                    : field === 'label'
                      ? (suggestPieceName({
                          colourName: shade(piece.colourShade)?.name ?? null,
                          categoryL2: piece.categoryL2,
                          categoryL3: piece.categoryL3,
                        }) ?? fields.name.placeholder)
                      : undefined
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={
                field === 'brand'
                  ? 'placeholder:font-display placeholder:font-light placeholder:text-lg placeholder:italic'
                  : undefined
              }
            />
          )}
          {field === 'price' || field === 'size' ? (
            <Text size="caption" tone="muted">
              {fields.price.helper}
            </Text>
          ) : null}
          {field === 'size' && piece.size ? (
            <Button variant="quiet" className="self-center" onClick={() => commit({ size: null })}>
              {fields.size.notSure}
            </Button>
          ) : null}
        </form>
      ) : field === 'season' ? (
        <SeasonOptions seasons={piece.seasons ?? []} onSave={onSave} />
      ) : field === 'material' ? (
        <MaterialPicker
          value={piece.material}
          // "Not sure" while nothing is filed is already the answer: it only closes.
          onChange={(material) => (material === piece.material ? onClose() : commit({ material }))}
        />
      ) : field === 'print' ? (
        <PrintPicker value={colour} onChange={(next) => commit({ print: next.print })} />
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
              const input = { colourShade: next.colourShade, colourExtra: next.colourExtra };
              // One main colour is the answer; additional colours are picked as many as there are.
              if (field === 'extra') onSave(input);
              else commit(input);
            }}
          />
        </div>
      )}
    </Sheet>
  );
}

// The price as she reads it: the currency chips (her region's first time), the symbol inside the
// field, a decimal keypad.
function PriceField({
  text,
  onText,
  currency,
  onCurrency,
}: {
  text: string;
  onText: (v: string) => void;
  currency: string;
  onCurrency: (code: string) => void;
}) {
  return (
    <>
      <ul aria-label={fields.price.currencies} className="flex flex-wrap gap-2">
        {PRICE_CURRENCIES.map((c) => (
          <li key={c.code}>
            <Pill selected={currency === c.code} onClick={() => onCurrency(c.code)}>
              {fields.price.chip(c.symbol, c.code)}
            </Pill>
          </li>
        ))}
      </ul>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-sans text-base text-ink-muted"
        >
          {symbolOf(currency)}
        </span>
        <Field
          label={copy.rows.price}
          labelHidden
          autoFocus
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => onText(e.target.value)}
          className="pl-10"
        />
      </div>
    </>
  );
}

// Beta's stepper: − UK 12 + in the serif, the conversion beside it, live as it steps. From
// nothing, the first step lands on the scale's start.
function SizeStepper({
  system,
  uk,
  onStep,
}: {
  system: 'clothing' | 'shoe';
  uk: number | null;
  onStep: (direction: 1 | -1) => void;
}) {
  const { min, max, start } = ukSizeBounds(system);
  const shown = uk ?? start;
  const conversion = convertUkSize(system, shown);
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex items-center gap-6">
        <IconButton
          icon="minus"
          label={fields.size.down}
          outlined
          disabled={uk !== null && uk <= min}
          onClick={() => onStep(-1)}
        />
        <output
          aria-live="polite"
          className={`min-w-28 text-center font-display font-light text-4xl ${
            uk === null ? 'text-ink-faint' : 'text-ink'
          }`}
        >
          {formatUkSize(shown)}
        </output>
        <IconButton
          icon="plus"
          label={fields.size.up}
          outlined
          disabled={uk !== null && uk >= max}
          onClick={() => onStep(1)}
        />
      </div>
      <Text size="small" tone="faint">
        {fields.size.conversion(conversion.eu, conversion.us)}
      </Text>
    </div>
  );
}

// The category drill's header (beta): the family as the eyebrow over the level she is in, and a
// back chevron to the level above.
function categoryHeader(drill: Drill): {
  title: string;
  eyebrow: string | null;
  back: { label: string; to: Drill } | null;
} {
  if (drill.sheetL1 && drill.l2)
    return {
      title: drill.l2,
      eyebrow: drill.sheetL1,
      back: { label: drill.sheetL1, to: { sheetL1: drill.sheetL1, l2: null } },
    };
  if (drill.sheetL1)
    return {
      title: drill.sheetL1,
      eyebrow: copy.rows.category,
      back: { label: copy.rows.category, to: { sheetL1: null, l2: null } },
    };
  return { title: copy.rows.category, eyebrow: null, back: null };
}

// Category › Subcategory › Item type (wardrobe_taxonomy) as a list, a level at a time: the drill
// stops wherever she does — "Just trousers", first, commits the subcategory alone.
function CategoryList({
  piece,
  drill,
  onDrill,
  onPick,
}: {
  piece: PieceValues;
  drill: Drill;
  onDrill: (d: Drill) => void;
  onPick: (input: UpdatePieceInput) => void;
}) {
  const commit = (l2: string, l3: string | null) => {
    const resolved = resolveTaxonomy(l2, l3);
    if (resolved) onPick({ categoryL2: resolved.categoryL2, categoryL3: resolved.categoryL3 });
  };
  const chevron = <Icon name="forward" size={15} className="shrink-0 text-ink-faint" />;
  const { sheetL1, l2 } = drill;
  if (sheetL1 && l2) {
    return (
      <div className="flex flex-col">
        <OptionRow
          italic
          label={copy.taxonomy.justThis(l2)}
          selected={piece.categoryL2 === l2 && piece.categoryL3 === null}
          aria-current={piece.categoryL2 === l2 && piece.categoryL3 === null ? true : undefined}
          onClick={() => commit(l2, null)}
        />
        {itemTypesOf(l2).map((l3) => (
          <OptionRow
            key={l3}
            label={l3}
            selected={piece.categoryL3 === l3}
            aria-current={piece.categoryL3 === l3 ? true : undefined}
            onClick={() => commit(l2, l3)}
          />
        ))}
      </div>
    );
  }
  if (sheetL1) {
    return (
      <div className="flex flex-col">
        {subcategoriesOf(sheetL1).map((sub) => (
          <OptionRow
            key={sub}
            label={sub}
            selected={piece.categoryL2 === sub}
            aria-current={piece.categoryL2 === sub ? true : undefined}
            trailing={chevron}
            onClick={() => onDrill({ sheetL1, l2: sub })}
          />
        ))}
      </div>
    );
  }
  const home = piece.categoryL2 ? sheetL1For(piece.categoryL2) : null;
  return (
    <div className="flex flex-col">
      {sheetCategories().map((cat) => (
        <OptionRow
          key={cat}
          label={cat}
          selected={home === cat}
          aria-current={home === cat ? true : undefined}
          trailing={chevron}
          onClick={() => onDrill({ sheetL1: cat, l2: null })}
        />
      ))}
    </div>
  );
}

// Her tags on the piece, in the one Tags picker a look shares (tags cleanup, 26 Nov): each tap is
// the answer, so the drawer writes as she goes. Native twin: TagsSheet.
function PieceTags({
  piece,
  onPick,
}: {
  piece: PieceValues;
  onPick: (input: UpdatePieceInput) => void;
}) {
  const picker = useTagsPicker(piece.wearFor, (wearFor) => onPick({ wearFor }));
  return (
    <div className="flex flex-col gap-4">
      {picker.list}
      {picker.addField}
    </div>
  );
}

// The four seasons (D12, PRD rev 3 §7.3), the Lookbook's own list (SeasonsView): Year round
// first, then each season with its glyph; each tap is the answer, and Year round clears the rest.
// Native twin: SeasonOptions in mobile/src/features/wardrobe/PieceFieldSheet.tsx.
function SeasonOptions({
  seasons,
  onSave,
}: {
  seasons: readonly Season[];
  onSave: (input: FieldInput) => void;
}) {
  const toggle = (s: Season) =>
    onSave({ seasons: seasons.includes(s) ? seasons.filter((x) => x !== s) : [...seasons, s] });
  return (
    <OptionList label={TITLES.season}>
      <ToggleRow
        label={seasonCopy.yearRound}
        on={seasons.length === 0}
        onToggle={() => onSave({ seasons: [] })}
      />
      {SEASONS.map((s) => (
        <ToggleRow
          key={s}
          label={seasonCopy.names[s]}
          on={seasons.includes(s)}
          icon={<Icon name={s} size={18} />}
          onToggle={() => toggle(s)}
        />
      ))}
    </OptionList>
  );
}
