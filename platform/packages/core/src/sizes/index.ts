import { sheetL1For } from '../taxonomy';

// The Size drawer (beta's stepper, redline audit 16): a piece's size steps along the scale its
// category uses, with the conversion read alongside. Clothing and shoes step in UK sizes; anything
// else (a bag, a belt, a bra) is hers to type, because no one scale fits it.
export type SizeSystem = 'clothing' | 'shoe' | 'plain';

const CLOTHING = new Set([
  // Sheet categories (wardrobe_taxonomy).
  'Tops',
  'Bottoms',
  'Dresses & jumpsuits',
  'Knitwear',
  'Outerwear',
  'Tailoring & suiting',
  'Activewear',
  'Swim & beach',
  'Loungewear & sleepwear',
  // The legacy single-level categories a piece without a type still carries.
  'Dresses',
  'Swimwear',
]);

export function sizeSystemFor(p: {
  categoryL2?: string | null;
  category?: string | null;
}): SizeSystem {
  const key = (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category || null;
  if (key === 'Shoes') return 'shoe';
  return key && CLOTHING.has(key) ? 'clothing' : 'plain';
}

interface Scale {
  min: number;
  max: number;
  step: number;
  // Where the stepper starts when nothing is filed (beta's default fact: UK 10, shoes UK 5).
  start: number;
  eu: (uk: number) => number;
  us: (uk: number) => number;
}

// Womenswear conversions: dress UK 12 = EU 40 = US 8; shoe UK 5 = EU 38 = US 7.
const SCALES: Record<Exclude<SizeSystem, 'plain'>, Scale> = {
  clothing: { min: 4, max: 26, step: 2, start: 10, eu: (uk) => uk + 28, us: (uk) => uk - 4 },
  shoe: { min: 2, max: 10, step: 0.5, start: 5, eu: (uk) => uk + 33, us: (uk) => uk + 2 },
};

const onScale = (scale: Scale, n: number): boolean =>
  Number.isFinite(n) &&
  n >= scale.min &&
  n <= scale.max &&
  Number.isInteger((n - scale.min) / scale.step);

// What is filed ("UK 12", "12", "uk 5.5") as a step on the scale, or null when it isn't one —
// a size typed some other way ("M", "W28 L30") stays hers, as text.
export function parseUkSize(system: SizeSystem, value: string | null | undefined): number | null {
  if (system === 'plain' || !value) return null;
  const m = value.trim().match(/^(?:uk\s*)?(\d{1,2}(?:[.,]5)?)$/i);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(',', '.'));
  return onScale(SCALES[system], n) ? n : null;
}

// The filed value: "UK 12", "UK 5.5".
export function formatUkSize(uk: number): string {
  return `UK ${uk}`;
}

// One tap of − or +: from nothing it lands on the scale's start, and it never leaves the scale.
export function stepUkSize(
  system: Exclude<SizeSystem, 'plain'>,
  current: number | null,
  direction: 1 | -1,
): number {
  const scale = SCALES[system];
  if (current === null || !onScale(scale, current)) return scale.start;
  return Math.min(scale.max, Math.max(scale.min, current + direction * scale.step));
}

export function ukSizeBounds(system: Exclude<SizeSystem, 'plain'>): {
  min: number;
  max: number;
  start: number;
} {
  const { min, max, start } = SCALES[system];
  return { min, max, start };
}

// The conversion read beside the stepper, live as it steps.
export function convertUkSize(
  system: Exclude<SizeSystem, 'plain'>,
  uk: number,
): { eu: number; us: number } {
  const scale = SCALES[system];
  return { eu: scale.eu(uk), us: scale.us(uk) };
}
