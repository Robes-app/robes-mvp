// The facts (handoff "The facts — engineering handoff", 24 Nov): one stored value per measurement
// and her display unit per field. A unit changes only how a value is shown; switching it never
// changes what is saved, and a converted number is never stored. Lengths are stored in cm (height
// and waist whole, the rest to one decimal so a half inch stays exact); dress size and shoes as UK
// numbers; the bust as a UK band and cup, converted on display.

export type MeasurePresence = 'woman' | 'man';
// 'unspecified' and non-binary take the woman's rows, as the twin and the catalog do.
export const measurePresenceOf = (gender: string | null | undefined): MeasurePresence =>
  gender === 'man' ? 'man' : 'woman';

export const MEASURE_FIELDS = [
  'height',
  'size',
  'bust',
  'chest',
  'waist',
  'inseam',
  'collar',
  'shoes',
  'shoulders',
] as const;
export type MeasureField = (typeof MEASURE_FIELDS)[number];

// The rows The facts shows, in order.
export const FACT_ROWS: Record<MeasurePresence, readonly MeasureField[]> = {
  woman: ['height', 'size', 'bust', 'waist', 'shoes'],
  man: ['height', 'chest', 'waist', 'inseam', 'collar', 'shoes', 'shoulders'],
};

export const MEASURE_UNITS = ['cm', 'in', 'uk', 'eu', 'us'] as const;
export type MeasureUnit = (typeof MEASURE_UNITS)[number];

// The units each row offers, in toggle order.
export const FIELD_UNITS: Record<MeasureField, readonly MeasureUnit[]> = {
  height: ['cm', 'in'],
  size: ['uk', 'eu', 'us'],
  bust: ['uk', 'us', 'eu'],
  chest: ['cm', 'in'],
  waist: ['cm', 'in'],
  inseam: ['cm', 'in'],
  collar: ['cm', 'in'],
  shoes: ['uk', 'eu', 'us'],
  shoulders: ['cm', 'in'],
};

export type UnitPrefs = Partial<Record<MeasureField, MeasureUnit>>;

const DEFAULT_UNIT: Record<MeasureField, MeasureUnit> = {
  height: 'cm',
  size: 'uk',
  bust: 'uk',
  chest: 'in',
  waist: 'cm',
  inseam: 'in',
  collar: 'in',
  shoes: 'uk',
  shoulders: 'in',
};

// Her unit for a row: what she chose, else the row's default. Men's waist defaults to inches (a
// display default only). A unit the row does not offer (an older client's bust `cm`) is the
// default.
export function unitFor(prefs: unknown, field: MeasureField, presence: MeasurePresence) {
  const p = prefs && typeof prefs === 'object' ? (prefs as Record<string, unknown>)[field] : null;
  if (typeof p === 'string' && (FIELD_UNITS[field] as readonly string[]).includes(p)) {
    return p as MeasureUnit;
  }
  return field === 'waist' && presence === 'man' ? 'in' : DEFAULT_UNIT[field];
}

// Stored prefs read defensively: only a unit the row offers survives.
export function readUnitPrefs(v: unknown): UnitPrefs {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const out: UnitPrefs = {};
  for (const field of MEASURE_FIELDS) {
    const u = o[field];
    if (typeof u === 'string' && (FIELD_UNITS[field] as readonly string[]).includes(u)) {
      out[field] = u as MeasureUnit;
    }
  }
  return out;
}

// What each row reads and writes: the stored facts (a subset of the contract's Facts).
export interface MeasureFacts {
  heightCm: number | null;
  sizeUk: number | null;
  shoeUk: number | null;
  bustBand: number | null;
  bustCup: string | null;
  bustCm: number | null;
  waistCm: number | null;
  chestCm: number | null;
  inseamCm: number | null;
  collarCm: number | null;
  shoulderWidthCm: number | null;
}

// What a pick saves: the same facts, a cup only ever one of BUST_CUPS.
export type MeasurePatch = Partial<Omit<MeasureFacts, 'bustCup'>> & { bustCup?: BustCup | null };

// The facts each row clears, and Clear the facts empties (never her age).
export const CLEARED_FACTS: { [K in keyof MeasureFacts]: null } = {
  heightCm: null,
  sizeUk: null,
  shoeUk: null,
  bustBand: null,
  bustCup: null,
  bustCm: null,
  waistCm: null,
  chestCm: null,
  inseamCm: null,
  collarCm: null,
  shoulderWidthCm: null,
};

// What may be stored, per fact (the database checks the same bounds). Wider than any picker so a
// value saved before the redesign (a man's chest from the tape, 70–140 cm) still reads.
export const STORED_RANGES = {
  heightCm: { min: 140, max: 210 },
  sizeUk: { min: 4, max: 24 },
  shoeUk: { min: 2, max: 13 },
  bustBand: { min: 28, max: 46 },
  bustCm: { min: 70, max: 140 },
  waistCm: { min: 50, max: 130 },
  chestCm: { min: 70, max: 150 },
  inseamCm: { min: 50, max: 110 },
  collarCm: { min: 30, max: 55 },
  shoulderWidthCm: { min: 30, max: 65 },
} as const;

// UK cup letters, and the US and EU letter at the same position (cups map by place, not formula).
export const BUST_CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G'] as const;
export type BustCup = (typeof BUST_CUPS)[number];
const CUP_LETTERS: Record<'uk' | 'us' | 'eu', readonly string[]> = {
  uk: BUST_CUPS,
  us: ['AA', 'A', 'B', 'C', 'D', 'DD', 'DDD', 'G', 'H', 'I'],
  eu: ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
};
// A cup saved before 24 Nov as "G+" reads as G; anything else unknown reads as no cup.
export function cupOf(v: string | null | undefined): BustCup | null {
  if (v === 'G+') return 'G';
  return (BUST_CUPS as readonly string[]).includes(v ?? '') ? (v as BustCup) : null;
}

export const BUST_BANDS = range(28, 44, 2);
const bustUnit = (u: MeasureUnit): 'uk' | 'us' | 'eu' => (u === 'us' || u === 'eu' ? u : 'uk');
export const bandIn = (band: number, unit: MeasureUnit): number =>
  bustUnit(unit) === 'eu' ? band * 2.5 - 10 : band;
export const cupIn = (cup: BustCup, unit: MeasureUnit): string =>
  CUP_LETTERS[bustUnit(unit)][BUST_CUPS.indexOf(cup)] ?? cup;

function range(a: number, b: number, step: number): number[] {
  const out: number[] = [];
  for (let v = a; v <= b + 1e-9; v += step) out.push(Math.round(v * 2) / 2);
  return out;
}

const IN = 2.54;
type Kind = 'whole' | 'tenth';
interface Length {
  kind: 'length';
  key: 'heightCm' | 'waistCm' | 'chestCm' | 'inseamCm' | 'collarCm' | 'shoulderWidthCm';
  stored: Kind;
  // Half inches on the inch wheel (collar, shoulders).
  halfIn: boolean;
  cm: [number, number];
  in: [number, number];
}
interface Scale {
  kind: 'scale';
  key: 'sizeUk' | 'shoeUk';
  // The display number from the stored UK number, and back, per unit.
  to: Record<'uk' | 'eu' | 'us', (uk: number) => number>;
  from: Record<'uk' | 'eu' | 'us', (n: number) => number>;
  opts: Record<'uk' | 'eu' | 'us', [number, number, number]>;
}
type Spec = Length | Scale;

function spec(field: Exclude<MeasureField, 'bust'>, presence: MeasurePresence): Spec {
  const man = presence === 'man';
  switch (field) {
    case 'height':
      // 82 in is 208 cm: 83 in would be 211 cm, past what is stored.
      return {
        kind: 'length',
        key: 'heightCm',
        stored: 'whole',
        halfIn: false,
        cm: [140, 210],
        in: [55, 82],
      };
    case 'waist':
      return man
        ? {
            kind: 'length',
            key: 'waistCm',
            stored: 'whole',
            halfIn: false,
            cm: [71, 102],
            in: [28, 40],
          }
        : {
            kind: 'length',
            key: 'waistCm',
            stored: 'whole',
            halfIn: false,
            cm: [55, 120],
            in: [22, 47],
          };
    case 'chest':
      return {
        kind: 'length',
        key: 'chestCm',
        stored: 'tenth',
        halfIn: false,
        cm: [86, 127],
        in: [34, 50],
      };
    case 'inseam':
      return {
        kind: 'length',
        key: 'inseamCm',
        stored: 'tenth',
        halfIn: false,
        cm: [66, 92],
        in: [26, 36],
      };
    case 'collar':
      return {
        kind: 'length',
        key: 'collarCm',
        stored: 'tenth',
        halfIn: true,
        cm: [36, 47],
        in: [14, 18.5],
      };
    case 'shoulders':
      return {
        kind: 'length',
        key: 'shoulderWidthCm',
        stored: 'tenth',
        halfIn: true,
        cm: [40, 54],
        in: [16, 21],
      };
    case 'size':
      return {
        kind: 'scale',
        key: 'sizeUk',
        to: { uk: (v) => v, eu: (v) => v + 28, us: (v) => v - 4 },
        from: { uk: (n) => n, eu: (n) => n - 28, us: (n) => n + 4 },
        opts: { uk: [4, 24, 2], eu: [32, 52, 2], us: [0, 20, 2] },
      };
    case 'shoes': {
      // US shoes run two sizes over UK for women, one for men; EU is UK + 33, rounded.
      const us = man ? 1 : 2;
      return {
        kind: 'scale',
        key: 'shoeUk',
        to: { uk: (v) => v, eu: (v) => Math.round(v + 33), us: (v) => v + us },
        from: { uk: (n) => n, eu: (n) => n - 33, us: (n) => n - us },
        opts: man
          ? { uk: [6, 13, 0.5], eu: [39, 46, 1], us: [7, 14, 0.5] }
          : { uk: [2, 8, 0.5], eu: [35, 41, 1], us: [4, 10, 0.5] },
      };
    }
  }
}

const scaleUnit = (u: MeasureUnit): 'uk' | 'eu' | 'us' => (u === 'eu' || u === 'us' ? u : 'uk');

// The picker's values for a row in a unit, in display numbers (inches for height are whole inches;
// the copy shows them as feet and inches).
export function optionsOf(
  field: Exclude<MeasureField, 'bust'>,
  unit: MeasureUnit,
  presence: MeasurePresence,
): number[] {
  const s = spec(field, presence);
  if (s.kind === 'scale') {
    const [a, b, step] = s.opts[scaleUnit(unit)];
    return range(a, b, step);
  }
  return unit === 'in' ? range(s.in[0], s.in[1], s.halfIn ? 0.5 : 1) : range(s.cm[0], s.cm[1], 1);
}

// The stored value shown in a unit, or null when she has not given it.
export function displayOf(
  field: Exclude<MeasureField, 'bust'>,
  unit: MeasureUnit,
  facts: MeasureFacts,
  presence: MeasurePresence,
): number | null {
  const s = spec(field, presence);
  const v = facts[s.key];
  if (v === null || v === undefined) return null;
  if (s.kind === 'scale') return s.to[scaleUnit(unit)](v);
  if (unit !== 'in') return Math.round(v);
  return s.halfIn ? Math.round((v / IN) * 2) / 2 : Math.round(v / IN);
}

// What a pick on the wheel stores: the canonical value, never the converted one.
export function storedPatch(
  field: Exclude<MeasureField, 'bust'>,
  unit: MeasureUnit,
  value: number,
  presence: MeasurePresence,
): MeasurePatch {
  const s = spec(field, presence);
  if (s.kind === 'scale') return { [s.key]: s.from[scaleUnit(unit)](value) };
  const cm = unit === 'in' ? value * IN : value;
  return { [s.key]: s.stored === 'whole' ? Math.round(cm) : Math.round(cm * 10) / 10 };
}

// Where the wheel opens on a row with nothing given (the prototype's middles).
export function startOf(
  field: Exclude<MeasureField, 'bust'>,
  presence: MeasurePresence,
): MeasureFacts {
  const man = presence === 'man';
  const start: Record<Exclude<MeasureField, 'bust'>, Partial<MeasureFacts>> = {
    height: { heightCm: man ? 178 : 168 },
    size: { sizeUk: 10 },
    waist: { waistCm: man ? 81 : 72 },
    shoes: { shoeUk: man ? 9 : 5 },
    chest: { chestCm: 101.6 },
    inseam: { inseamCm: 81.3 },
    collar: { collarCm: 39.4 },
    shoulders: { shoulderWidthCm: 45.7 },
  };
  return { ...CLEARED_FACTS, ...start[field] };
}

// The bust as she gave it in a unit: band and cup letter, or null until both are given. A tape
// measure saved before 24 Nov is not shown (it still shapes her twin until she picks a size).
export function bustOf(
  unit: MeasureUnit,
  facts: MeasureFacts,
): { band: number; cup: string } | null {
  const cup = cupOf(facts.bustCup);
  if (!facts.bustBand || !cup) return null;
  return { band: bandIn(facts.bustBand, unit), cup: cupIn(cup, unit) };
}

// A bust pick: band and cup together (the other starts at 34 / B), and the tape goes, so her twin
// follows the size she picked.
export function bustPatch(
  facts: MeasureFacts,
  pick: { band?: number; cup?: BustCup },
): MeasurePatch {
  return {
    bustBand: pick.band ?? facts.bustBand ?? 34,
    bustCup: pick.cup ?? cupOf(facts.bustCup) ?? 'B',
    bustCm: null,
  };
}

// The wheel: five slots around the current value (blank past either end), nearest when the stored
// value falls between steps or outside the range.
export interface WheelSlot<T> {
  value: T | null;
  selected: boolean;
  // Its place from the centre, −2 to 2 (a stable key); distance fades the outer ones.
  offset: number;
  distance: 0 | 1 | 2;
}
export function wheelOf<T>(
  list: readonly T[],
  current: T,
  near?: (v: T) => number,
): WheelSlot<T>[] {
  let i = list.indexOf(current);
  if (i < 0) {
    i = 0;
    if (near) {
      list.forEach((v, k) => {
        if (near(v) < near(list[i] as T)) i = k;
      });
    }
  }
  const out: WheelSlot<T>[] = [];
  for (let d = -2; d <= 2; d++) {
    const v = list[i + d];
    out.push({
      value: v === undefined ? null : v,
      selected: d === 0,
      offset: d,
      distance: Math.abs(d) as 0 | 1 | 2,
    });
  }
  return out;
}

// A row of The facts as it reads: its unit and what she gave in it (a number in that unit, or the
// bust's band and cup), null for "Add". The copy turns it into words.
export interface FactRow {
  field: MeasureField;
  unit: MeasureUnit;
  units: readonly MeasureUnit[];
  value: number | { band: number; cup: string } | null;
}
export function factRows(
  facts: MeasureFacts,
  prefs: unknown,
  presence: MeasurePresence,
): FactRow[] {
  return FACT_ROWS[presence].map((field) => {
    const unit = unitFor(prefs, field, presence);
    return {
      field,
      unit,
      units: FIELD_UNITS[field],
      value: field === 'bust' ? bustOf(unit, facts) : displayOf(field, unit, facts, presence),
    };
  });
}

// The picker for a row: one wheel (two for the bust, band and cup). Each slot carries what it
// shows in her unit and the patch a tap on it saves.
export interface PickerSlot {
  shown: number | string | null;
  selected: boolean;
  offset: number;
  distance: 0 | 1 | 2;
  patch: MeasurePatch | null;
}
export interface PickerColumn {
  key: 'value' | 'band' | 'cup';
  slots: PickerSlot[];
}
export function pickerOf(
  field: MeasureField,
  unit: MeasureUnit,
  facts: MeasureFacts,
  presence: MeasurePresence,
): PickerColumn[] {
  if (field === 'bust') {
    const band = facts.bustBand ?? 34;
    const cup = cupOf(facts.bustCup) ?? 'B';
    return [
      {
        key: 'band',
        slots: wheelOf(withSaved(BUST_BANDS, facts.bustBand), band, (v) => Math.abs(v - band)).map(
          (s) => ({
            ...s,
            shown: s.value === null ? null : bandIn(s.value, unit),
            patch:
              s.value === null || !BUST_BANDS.includes(s.value)
                ? null
                : bustPatch(facts, { band: s.value }),
          }),
        ),
      },
      {
        key: 'cup',
        slots: wheelOf(BUST_CUPS, cup).map((s) => ({
          ...s,
          shown: s.value === null ? null : cupIn(s.value, unit),
          patch: s.value === null ? null : bustPatch(facts, { cup: s.value }),
        })),
      },
    ];
  }
  const range = optionsOf(field, unit, presence);
  const saved = displayOf(field, unit, facts, presence);
  const list = withSaved(range, saved);
  const cur = saved ?? (displayOf(field, unit, startOf(field, presence), presence) as number);
  return [
    {
      key: 'value',
      slots: wheelOf(list, cur, (v) => Math.abs(v - cur)).map((s) => ({
        ...s,
        shown: s.value,
        patch:
          s.value === null || !range.includes(s.value)
            ? null
            : storedPatch(field, unit, s.value, presence),
      })),
    },
  ];
}

// A value she saved outside a wheel's range (given as the other gender, whose sizes run
// differently: her UK 5 shoes on his UK 6–13) stands as a slot of its own, so the wheel opens on
// what is saved, never on a neighbour. It saves nothing when tapped: it is already hers.
function withSaved(range: readonly number[], saved: number | null): number[] {
  return saved === null || range.includes(saved)
    ? [...range]
    : [...range, saved].sort((a, b) => a - b);
}

// The stored facts each gender's rows read (FACT_ROWS), and so what reaches a styling prompt: a
// switch of gender hides the other's rows and keeps their values, which never style him or her.
export const PRESENCE_FACTS: Record<MeasurePresence, readonly (keyof MeasureFacts)[]> = {
  woman: ['heightCm', 'sizeUk', 'bustBand', 'bustCup', 'bustCm', 'waistCm', 'shoeUk'],
  man: ['heightCm', 'chestCm', 'waistCm', 'inseamCm', 'collarCm', 'shoeUk', 'shoulderWidthCm'],
};
export function factsFor<T extends Partial<MeasureFacts>>(facts: T, presence: MeasurePresence): T {
  const keep = PRESENCE_FACTS[presence] as readonly string[];
  return Object.fromEntries(
    Object.entries(facts).map(([k, v]) => [k, k in CLEARED_FACTS && !keep.includes(k) ? null : v]),
  ) as T;
}
