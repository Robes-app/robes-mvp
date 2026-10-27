import { type PieceValues, SeasonBand, type UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
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
  itemTypesOf,
  resolveTaxonomy,
  sheetCategories,
  sheetL1For,
  subcategoriesOf,
  WEAR_SEEDS,
} from '@robes/core/taxonomy';
import {
  currencyForLocale,
  PRICE_CURRENCIES,
  parsePriceInput,
  suggestPieceName,
} from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Field,
  fonts,
  Heading,
  IconButton,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  Pill,
  Sheet,
  Text,
  useColor,
} from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ColourPicker, OptionRow, PrintPicker } from './ColourField';
import { MaterialPicker } from './MaterialField';

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

// The drawers she types into: one field, a Save that waits for a change (redline "one
// single-field sheet").
const TYPED: ReadonlySet<PieceField> = new Set(['label', 'brand', 'size', 'price', 'notes']);

// The record the drawer opens on: the row values, and the category the piece files under (it
// decides the size scale).
export type FieldPiece = PieceValues & { category?: string | null };

const colourOf = (p: PieceValues): PieceColour => ({
  colourShade: p.colourShade,
  colourExtra: p.colourExtra,
  print: p.print,
});

const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);

const textOf = (field: PieceField, p: PieceValues): string =>
  field === 'label'
    ? p.label
    : field === 'brand'
      ? (p.brand ?? '')
      : field === 'size'
        ? (p.size ?? '')
        : field === 'price'
          ? p.price === null
            ? ''
            : String(p.price)
          : field === 'notes'
            ? (p.notes ?? '')
            : '';

// Where the category drill opens: where the piece already sits.
type Drill = { sheetL1: string | null; l2: string | null };
const drillOf = (p: PieceValues): Drill => ({
  sheetL1: (p.categoryL2 ? sheetL1For(p.categoryL2) : null) ?? null,
  l2: p.categoryL2,
});

const symbolOf = (code: string): string =>
  PRICE_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;

const deviceLocale = (): string | undefined => {
  try {
    return Intl.NumberFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
};

// One drawer per field (legacy __psOpen): it opens on what is filed. A pick is the answer and
// closes it; a typed field saves once it has changed. The web twin is
// components/wardrobe/piece-field-sheet.tsx.
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
  onSave: (input: UpdatePieceInput) => void;
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

  // The drawer opens on what is filed now, whichever field she tapped.
  useEffect(() => {
    if (!field) return;
    setColour(colourOf(piece));
    setText(textOf(field, piece));
    setCurrency(piece.currency ?? currencyForLocale(deviceLocale()));
    setUk(parseUkSize(sizeSystemFor(piece), piece.size));
    setDrill(drillOf(piece));
  }, [field, piece]);

  const commit = (input: UpdatePieceInput) => {
    onSave(input);
    onClose();
  };

  // What Save would write, or null while nothing has changed (or the price isn't one).
  const pending = (): UpdatePieceInput | null => {
    if (field === 'label') {
      const label = text.trim();
      return label && label !== piece.label ? { label } : null;
    }
    if (field === 'brand') return orNull(text) === piece.brand ? null : { brand: orNull(text) };
    if (field === 'notes') return orNull(text) === piece.notes ? null : { notes: orNull(text) };
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
  const next = field && TYPED.has(field) ? pending() : null;
  const save = () => {
    if (next) commit(next);
  };

  const category = field === 'category' ? categoryHeader(drill) : null;
  const back = category?.back;

  return (
    <Sheet
      open={field !== null}
      onClose={onClose}
      title={category?.title ?? (field ? TITLES[field] : '')}
      {...(category?.eyebrow ? { eyebrow: category.eyebrow } : {})}
      {...(back
        ? {
            leading: (
              <IconButton
                icon="back"
                label={fields.back(back.label)}
                tone="ink-muted"
                onPress={() => setDrill(back.to)}
              />
            ),
          }
        : {})}
      {...(field === 'wearFor' ? { closeLabel: copy.done } : { closeButton: true })}
    >
      <View className="gap-4 pb-6">
        {field === 'wearFor' ? (
          <WearForPicker piece={piece} onPick={onSave} />
        ) : field === 'category' ? (
          <CategoryList piece={piece} drill={drill} onDrill={setDrill} onPick={commit} />
        ) : field === 'season' ? (
          // The bands as a list of answers, a pick saves and closes (beta's Season sheet).
          <View accessibilityRole="radiogroup" accessibilityLabel={TITLES.season}>
            {SeasonBand.options.map((band) => (
              <OptionRow
                key={band}
                accessibilityRole="radio"
                accessibilityState={{ checked: piece.seasonBand === band }}
                selected={piece.seasonBand === band}
                label={wardrobe.filter.seasons[band]}
                onPress={() => commit({ seasonBand: band })}
              />
            ))}
          </View>
        ) : field === 'material' ? (
          <MaterialPicker value={piece.material} onChange={(material) => commit({ material })} />
        ) : field === 'print' ? (
          <PrintPicker value={colour} onChange={(next) => commit({ print: next.print })} />
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
                const input = { colourShade: next.colourShade, colourExtra: next.colourExtra };
                // One main colour is the answer; additional colours are picked as many as there are.
                if (field === 'extra') onSave(input);
                else commit(input);
              }}
            />
          </>
        ) : field === 'price' ? (
          <PriceField
            text={text}
            onText={setText}
            currency={currency}
            onCurrency={setCurrency}
            onSubmit={save}
          />
        ) : field === 'size' && stepper ? (
          <SizeStepper
            system={stepper}
            uk={uk}
            onStep={(direction) => setUk(stepUkSize(stepper, uk, direction))}
          />
        ) : field ? (
          <Field
            label={TITLES[field]}
            labelHidden
            autoFocus
            value={text}
            onChangeText={setText}
            multiline={field === 'notes'}
            returnKeyType={field === 'notes' ? 'default' : 'done'}
            onSubmitEditing={field === 'notes' ? undefined : save}
            placeholder={
              field === 'brand'
                ? fields.brand.placeholder
                : field === 'notes'
                  ? fields.notes.placeholder
                  : field === 'label'
                    ? (suggestPieceName({
                        colourName: shade(piece.colourShade)?.name ?? null,
                        categoryL2: piece.categoryL2,
                        categoryL3: piece.categoryL3,
                      }) ?? fields.name.placeholder)
                    : undefined
            }
            maxLength={
              field === 'notes' ? 1000 : field === 'label' ? 120 : field === 'brand' ? 80 : 40
            }
            // Notes open at four lines and grow to eight; the brand's prompt is the serif italic.
            className={field === 'notes' ? 'max-h-48' : undefined}
            style={
              field === 'brand' && !text
                ? { fontFamily: fonts.displayItalic, fontSize: 17 }
                : undefined
            }
          />
        ) : null}
        {field === 'price' || field === 'size' ? (
          <Text size="caption" tone="muted">
            {fields.price.helper}
          </Text>
        ) : null}
        {field === 'size' && piece.size ? (
          <Button variant="quiet" className="self-center" onPress={() => commit({ size: null })}>
            {fields.size.notSure}
          </Button>
        ) : null}
        {field && TYPED.has(field) ? (
          <Button loading={saving} disabled={!next} onPress={save}>
            {copy.saveField}
          </Button>
        ) : null}
      </View>
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
  onSubmit,
}: {
  text: string;
  onText: (v: string) => void;
  currency: string;
  onCurrency: (code: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <View accessibilityLabel={fields.price.currencies} className="flex-row flex-wrap gap-2">
        {PRICE_CURRENCIES.map((c) => (
          <Pill key={c.code} selected={currency === c.code} onPress={() => onCurrency(c.code)}>
            {fields.price.chip(c.symbol, c.code)}
          </Pill>
        ))}
      </View>
      <View>
        <Field
          label={copy.rows.price}
          labelHidden
          autoFocus
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          value={text}
          onChangeText={onText}
          className="pl-10"
        />
        <View pointerEvents="none" className="absolute inset-y-0 left-4 justify-center">
          <Text tone="muted">{symbolOf(currency)}</Text>
        </View>
      </View>
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
  const ink = useColor('ink');
  const { min, max, start } = ukSizeBounds(system);
  const shown = uk ?? start;
  const conversion = convertUkSize(system, shown);
  const step = (direction: 1 | -1, label: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onStep(direction)}
      style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
      className={`items-center justify-center rounded-pill border border-border-control ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <Icon name={direction === 1 ? 'plus' : 'minus'} size={20} color={ink} />
    </Pressable>
  );
  return (
    <View className="items-center gap-2 py-2">
      <View className="flex-row items-center gap-6">
        {step(-1, fields.size.down, uk !== null && uk <= min)}
        <Heading
          size="lg"
          tone={uk === null ? 'faint' : 'ink'}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          className="min-w-28 text-center"
        >
          {formatUkSize(shown)}
        </Heading>
        {step(1, fields.size.up, uk !== null && uk >= max)}
      </View>
      <Text size="small" tone="faint">
        {fields.size.conversion(conversion.eu, conversion.us)}
      </Text>
    </View>
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
  const faint = useColor('ink-faint');
  const commit = (l2: string, l3: string | null) => {
    const resolved = resolveTaxonomy(l2, l3);
    if (resolved) onPick({ categoryL2: resolved.categoryL2, categoryL3: resolved.categoryL3 });
  };
  const chevron = <Icon name="forward" size={15} color={faint} />;
  const { sheetL1, l2 } = drill;
  if (sheetL1 && l2) {
    return (
      <View>
        <OptionRow
          italic
          label={copy.taxonomy.justThis(l2)}
          selected={piece.categoryL2 === l2 && piece.categoryL3 === null}
          onPress={() => commit(l2, null)}
        />
        {itemTypesOf(l2).map((l3) => (
          <OptionRow
            key={l3}
            label={l3}
            selected={piece.categoryL3 === l3}
            onPress={() => commit(l2, l3)}
          />
        ))}
      </View>
    );
  }
  if (sheetL1) {
    return (
      <View>
        {subcategoriesOf(sheetL1).map((sub) => (
          <OptionRow
            key={sub}
            label={sub}
            selected={piece.categoryL2 === sub}
            trailing={chevron}
            onPress={() => onDrill({ sheetL1, l2: sub })}
          />
        ))}
      </View>
    );
  }
  const home = piece.categoryL2 ? sheetL1For(piece.categoryL2) : null;
  return (
    <View>
      {sheetCategories().map((cat) => (
        <OptionRow
          key={cat}
          label={cat}
          selected={home === cat}
          trailing={chevron}
          onPress={() => onDrill({ sheetL1: cat, l2: null })}
        />
      ))}
    </View>
  );
}

const WEAR_MAX = 6;

// What she wears it for: the seven seeds, then her own in the order she made them, multi-select.
// Each tap is the answer; "+ Your own" turns into a field where Return adds the tag and picks it.
// The web twin is components/wardrobe/piece-field-sheet.tsx.
function WearForPicker({
  piece,
  onPick,
}: {
  piece: PieceValues;
  onPick: (input: UpdatePieceInput) => void;
}) {
  const seeds: string[] = WEAR_SEEDS.map((s) => s.label);
  const chosen = piece.wearFor;
  // Her own tags stay listed while the drawer is open, picked or not.
  const [own, setOwn] = useState<string[]>(() => chosen.filter((c) => !seeds.includes(c)));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const options = [...seeds, ...own.filter((o) => !seeds.includes(o))];
  const toggle = (label: string) => {
    if (chosen.includes(label)) onPick({ wearFor: chosen.filter((c) => c !== label) });
    else if (chosen.length < WEAR_MAX) onPick({ wearFor: [...chosen, label] });
  };
  const add = () => {
    const typed = draft.trim();
    setDraft('');
    setAdding(false);
    if (!typed) return;
    const label = options.find((o) => o.toLowerCase() === typed.toLowerCase()) ?? typed;
    if (!options.includes(label)) setOwn((o) => [...o, label]);
    if (!chosen.includes(label) && chosen.length < WEAR_MAX)
      onPick({ wearFor: [...chosen, label] });
  };
  return (
    <View className="gap-4">
      <Text size="small" tone="muted">
        {fields.wearFor.helper}
      </Text>
      <View className="flex-row flex-wrap items-center gap-2">
        {options.map((label) => (
          <Pill key={label} selected={chosen.includes(label)} onPress={() => toggle(label)}>
            {label}
          </Pill>
        ))}
        {adding ? (
          <TextInput
            autoFocus
            accessibilityLabel={fields.wearFor.ownLabel}
            value={draft}
            maxLength={40}
            returnKeyType="done"
            onChangeText={setDraft}
            onSubmitEditing={add}
            onBlur={() => {
              if (!draft.trim()) setAdding(false);
            }}
            maxFontSizeMultiplier={maxFontSizeMultiplier.control}
            className="min-h-9 w-40 rounded-pill border border-border-control bg-surface-raised px-4 text-sm text-ink"
            style={{ fontFamily: fonts.sans }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fields.wearFor.own}
            onPress={() => setAdding(true)}
            style={{ minHeight: MIN_TOUCH }}
            className="justify-center"
          >
            <View className="min-h-9 justify-center rounded-pill border border-border-control border-dashed px-4">
              <Text size="small" tone="muted">
                {fields.wearFor.own}
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}
