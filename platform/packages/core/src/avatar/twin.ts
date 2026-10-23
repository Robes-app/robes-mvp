// Her digital twin (legacy 2026-10-20): the face from one close-up, the line from the facts and
// three sliders. These are the numbers both clients draw the figure from and the server keys and
// describes the twin from; the words live in the prompt module.

import { DEFAULT_HAIR, DEFAULT_SKIN, HAIR_SWATCHES, nearestIndex, SKIN_SWATCHES } from './index';

// Bumping this redraws every twin: the key carries it.
export const TWIN_STYLE = 'v1';

export const BUST_CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G+'] as const;
export type BustCup = (typeof BUST_CUPS)[number];

export const TWIN_RANGES = {
  bustBand: { min: 28, max: 46, step: 2, start: 34 },
  bustCm: { min: 70, max: 140, step: 1, start: 88 },
  waistCm: { min: 50, max: 130, step: 1, start: 70 },
} as const;
export type TwinStep = keyof typeof TWIN_RANGES;

export function stepTwinFact(kind: TwinStep, value: number | null, dir: 1 | -1): number {
  const r = TWIN_RANGES[kind];
  const next = value === null ? r.start : value + dir * r.step;
  return Math.min(r.max, Math.max(r.min, next));
}

// An unfilled model is a woman, size 10, 35; an age band resolves to its youngest year.
export const TWIN_DEFAULTS = { sizeUk: 10, age: 35, heightCm: 165 } as const;
const AGE_YEARS: Record<string, number> = {
  under_25: 22,
  '25_34': 25,
  '35_44': 35,
  '45_54': 45,
  '55_64': 55,
  '65_plus': 65,
};
export const twinAge = (band: string | null | undefined): number =>
  (band && AGE_YEARS[band]) || TWIN_DEFAULTS.age;

export const TWIN_SCALES = ['shoulders', 'bust', 'hips'] as const;
export type TwinScale = (typeof TWIN_SCALES)[number];
export type Stop = -2 | -1 | 0 | 1 | 2;
export const STOPS: readonly Stop[] = [-2, -1, 0, 1, 2];
// null on a scale is "from your facts".
export type TwinAdj = Record<TwinScale, Stop | null>;
export const NO_ADJ: TwinAdj = { shoulders: null, bust: null, hips: null };

export interface TwinFacts {
  heightCm: number | null;
  sizeUk: number | null;
  bustBand: number | null;
  bustCup: string | null;
  bustCm: number | null;
  waistCm: number | null;
  ageBand: string | null;
}

const isStop = (v: unknown): v is Stop => Number.isInteger(v) && Math.abs(v as number) <= 2;

// Stored sliders read defensively: anything but a stop is "from your facts".
export function readAdj(v: unknown): TwinAdj {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    shoulders: isStop(o.shoulders) ? o.shoulders : null,
    bust: isStop(o.bust) ? o.bust : null,
    hips: isStop(o.hips) ? o.hips : null,
  };
}

// A legacy full-length read seeds the sliders once, so nobody's line regresses when the
// full-length ask goes; after that the sliders are hers.
const LEGACY_SEED: Record<string, Partial<TwinAdj>> = {
  Hourglass: { bust: 1 },
  Pear: { hips: 1 },
  Rectangle: {},
  'Inverted Triangle': { shoulders: 1, hips: -1 },
  Apple: { bust: 1 },
};
export function adjFor(stored: unknown, bodyType: string | null | undefined): TwinAdj {
  if (stored !== undefined && stored !== null) return readAdj(stored);
  return { ...NO_ADJ, ...(bodyType ? (LEGACY_SEED[bodyType] ?? {}) : {}) };
}

export function bustCmOf(f: Pick<TwinFacts, 'bustBand' | 'bustCup' | 'bustCm'>): number | null {
  if (f.bustCm) return f.bustCm;
  const cup = BUST_CUPS.indexOf(f.bustCup as BustCup);
  if (f.bustBand && cup >= 0) return Math.round(f.bustBand * 2.54 + (cup + 0.5) * 2.54);
  return null;
}

// The sliders as they stand: hers where set, else seeded from the facts (bust from the bust−waist
// difference, the design's rule; the rest at "as she is").
export function effectiveStops(facts: TwinFacts, adj: TwinAdj) {
  const b = bustCmOf(facts);
  const waistDiff = b && facts.waistCm ? b - facts.waistCm : null;
  const seed: Stop =
    waistDiff === null ? 0 : waistDiff < 10 ? -1 : waistDiff < 18 ? 0 : waistDiff < 26 ? 1 : 2;
  return {
    shoulders: adj.shoulders ?? 0,
    bust: adj.bust ?? seed,
    hips: adj.hips ?? 0,
    seedBust: seed,
    waistDiff,
  };
}

export const isAdjusted = (adj: TwinAdj): boolean => TWIN_SCALES.some((k) => adj[k] !== null);

export interface TwinFigure {
  d: string;
  headY: number;
  headRx: number;
  headRy: number;
  guides: { bust: number; waist: number; hips: number };
  ground: number;
}

// The parametric figure (design 3C, legacy twFig): drawn live from height, size, bust, waist and
// the sliders in a 150 × 250 box — the instant feedback while the photograph is redrawn.
export function twinFigure(facts: TwinFacts, adj: TwinAdj): TwinFigure {
  const e = effectiveStops(facts, adj);
  const sf = 1 + ((facts.sizeUk ?? TWIN_DEFAULTS.sizeUk) - 10) * 0.035;
  const H = Math.min(236, (214 * (facts.heightCm ?? TWIN_DEFAULTS.heightCm)) / 165);
  const top = 246 - H;
  const u = H / 200;
  const bustCm = bustCmOf(facts);
  const ws = 25 * sf + e.shoulders * 3;
  const wbBase = bustCm ? (24 * bustCm) / 88 : 24 * sf;
  const wb = wbBase + (e.bust - e.seedBust) * 2.6 + (bustCm ? 0 : e.bust * 2.6);
  const ww = facts.waistCm ? (18 * facts.waistCm) / 70 : 18 * sf;
  const wh = 26 * sf + e.hips * 3.2;
  const P = (x: number, y: number): [number, number] => [75 + x, top + y * u];
  const outer = (
    [
      [5, 26],
      [ws - 5, 33],
      [ws, 40],
      [wb, 60],
      [wb - 1.5, 70],
      [ww, 90],
      [wh, 116],
      [wh - 3, 136],
      [10, 168],
      [6, 197],
    ] as const
  ).map(([x, y]) => P(x, y));
  const f1 = (n: number) => n.toFixed(1);
  const f2 = (p: readonly [number, number]) => `${f1(p[0])},${f1(p[1])}`;
  // Catmull-Rom through the points, as cubic Béziers.
  const curve = (pts: [number, number][]) => {
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i] as [number, number];
      const p2 = pts[i + 1] as [number, number];
      const p0 = pts[i - 1] ?? p1;
      const p3 = pts[i + 2] ?? p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6] as const;
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6] as const;
      d += ` C${f2(c1)} ${f2(c2)} ${f2(p2)}`;
    }
    return d;
  };
  const mirror = (pts: [number, number][]) => pts.map(([x, y]): [number, number] => [150 - x, y]);
  const ankle = P(1.5, 199);
  const crotch = P(0.6, 128);
  const left = mirror(outer).reverse();
  const first = outer[0] as [number, number];
  const leftFirst = left[0] as [number, number];
  const d = `M${f2(first)}${curve(outer)} L${f2(ankle)} L${f2(crotch)} L${f2([150 - ankle[0], ankle[1]])} L${f2(leftFirst)}${curve(left)} Z`;
  return {
    d,
    headY: top + 13 * u,
    headRx: 8.5,
    headRy: 11 * u,
    guides: { bust: top + 60 * u, waist: top + 90 * u, hips: top + 116 * u },
    ground: Math.min(249, top + 201 * u),
  };
}

export interface TwinInputs {
  gender: 'woman' | 'man';
  facts: TwinFacts;
  adj: TwinAdj;
  skin: number;
  hair: number;
  // A hand pick of skin or hair overrides what the photograph shows.
  skinSet: boolean;
  hairSet: boolean;
  closeUpAssetId: string | null;
}

// What the twin is drawn from, as one string the server hashes: same inputs, same key, no redraw.
export function twinKeyMaterial(i: TwinInputs): string {
  const f = i.facts;
  return JSON.stringify([
    TWIN_STYLE,
    i.gender,
    [f.heightCm, f.sizeUk, f.bustBand, f.bustCup, f.bustCm, f.waistCm, f.ageBand],
    [i.adj.shoulders, i.adj.bust, i.adj.hips],
    i.skin,
    i.hair,
    i.skinSet,
    i.hairSet,
    i.closeUpAssetId,
  ]);
}

// The prompt's view of the inputs: resolved stops and age, never the raw facts.
export interface TwinSpec {
  gender: 'woman' | 'man';
  heightCm: number | null;
  sizeUk: number;
  stops: { shoulders: Stop; bust: Stop; hips: Stop };
  waistDiff: number | null;
  age: number;
  skin: number;
  hair: number;
  skinSet: boolean;
  hairSet: boolean;
  hasFace: boolean;
}

export function twinSpec(i: TwinInputs, hasFace: boolean): TwinSpec {
  const e = effectiveStops(i.facts, i.adj);
  return {
    gender: i.gender,
    heightCm: i.facts.heightCm,
    sizeUk: i.facts.sizeUk ?? TWIN_DEFAULTS.sizeUk,
    stops: { shoulders: e.shoulders, bust: e.bust, hips: e.hips },
    waistDiff: e.waistDiff,
    age: twinAge(i.facts.ageBand),
    skin: i.skin,
    hair: i.hair,
    skinSet: i.skinSet,
    hairSet: i.hairSet,
    hasFace,
  };
}

// What a stored model row says the twin is drawn from (shared by the API and the worker).
export interface TwinSource {
  genderIdentity: string | null;
  avatarPrefs: unknown;
  heightCm: number | null;
  sizeUk: number | null;
  bustBand: number | null;
  bustCup: string | null;
  bustCm: number | null;
  waistCm: number | null;
  ageBand: string | null;
  bodyType: string | null;
  headshotAssetId: string | null;
  skinHex: string | null;
  hairHex: string | null;
}

const pick = (prefs: unknown, k: string, max: number): number | undefined => {
  const v = prefs && typeof prefs === 'object' ? (prefs as Record<string, unknown>)[k] : undefined;
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max
    ? (v as number)
    : undefined;
};

export function twinInputsOf(row: TwinSource): TwinInputs {
  const prefs = row.avatarPrefs;
  const skin = pick(prefs, 'skin', 7);
  const hair = pick(prefs, 'hair', 4);
  const adj =
    prefs && typeof prefs === 'object' ? (prefs as Record<string, unknown>).adj : undefined;
  return {
    // 'unspecified' rides the woman's catalog, as the cells do.
    gender: row.genderIdentity === 'man' ? 'man' : 'woman',
    facts: {
      heightCm: row.heightCm,
      sizeUk: row.sizeUk,
      bustBand: row.bustBand,
      bustCup: row.bustCup,
      bustCm: row.bustCm,
      waistCm: row.waistCm,
      ageBand: row.ageBand,
    },
    adj: adjFor(adj, row.bodyType),
    skin: skin ?? nearestIndex(row.skinHex, SKIN_SWATCHES, DEFAULT_SKIN),
    hair: hair ?? nearestIndex(row.hairHex, HAIR_SWATCHES, DEFAULT_HAIR),
    skinSet: skin !== undefined,
    hairSet: hair !== undefined,
    closeUpAssetId: row.headshotAssetId,
  };
}

// Anything to draw her from: a close-up, a fact, a slider or a hand pick. Nothing → the catalog.
export const hasTwinInputs = (i: TwinInputs): boolean =>
  i.closeUpAssetId !== null ||
  Object.values(i.facts).some((v) => v !== null) ||
  isAdjusted(i.adj) ||
  i.skinSet ||
  i.hairSet;

// The twin's cache key: a short hash of everything it is drawn from (Web Crypto, server-side).
export async function twinKey(i: TwinInputs): Promise<string> {
  const bytes = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(twinKeyMaterial(i)),
  );
  return [...new Uint8Array(bytes)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
