// The Robes models (plan 2026-11-05): five shared portraits per wearer that a look stands on until
// she has a twin of her own, each drawn once ever by the twin prompt with no face. A Robes model is
// a catalog cell (`w-r4`, `m-r2`) so storage, delivery and caching are the cells'; what sets it
// apart from a picks cell is that its age and size are part of what it is.
import { cellKey, parseCellId } from './index';
import type { Stop, TwinSpec } from './twin';

export type RobesModelN = 1 | 2 | 3 | 4 | 5;
export const ROBES_MODEL_NS: readonly RobesModelN[] = [1, 2, 3, 4, 5];

// Annie's five (7 Nov), in her order: two hand-picked catalog portraits (Sand · Ash blonde, Tan ·
// Espresso), the older model, Porcelain · Caramel, the larger model. Skin and hair index the
// swatches. v2 is that lineup: the women's portraits are preloaded from the ones she chose
// (`pnpm migrate:robes-models`), the men's drawn from these facts. Bumping the style redraws all ten.
export const ROBES_MODELS: readonly {
  n: RobesModelN;
  skin: number;
  hair: number;
  age: number;
  sizeUk: number;
  stops: { shoulders: Stop; bust: Stop; hips: Stop };
}[] = [
  { n: 1, skin: 5, hair: 4, age: 35, sizeUk: 10, stops: { shoulders: 0, bust: 0, hips: 0 } },
  { n: 2, skin: 3, hair: 1, age: 35, sizeUk: 10, stops: { shoulders: 0, bust: 0, hips: 0 } },
  { n: 3, skin: 6, hair: 5, age: 62, sizeUk: 12, stops: { shoulders: 0, bust: 0, hips: 0 } },
  { n: 4, skin: 7, hair: 3, age: 35, sizeUk: 10, stops: { shoulders: 0, bust: 0, hips: 0 } },
  { n: 5, skin: 2, hair: 1, age: 35, sizeUk: 18, stops: { shoulders: 0, bust: 1, hips: 1 } },
];
export const ROBES_MODEL_STYLE = 'v2';

// The lineup's order (Annie, 7 Nov): fixed (her own model first once she has one, then the five
// in order) until she chooses; the one her looks stand on then leads, checked. Home's picker and
// the model page, web and native, all read it.
export type LineupSlot = 'own' | RobesModelN;
export function lineupOrder(s: { own: boolean; chosen: 'own' | number | null }): LineupSlot[] {
  const fixed: LineupSlot[] = s.own ? ['own', ...ROBES_MODEL_NS] : [...ROBES_MODEL_NS];
  const lead = fixed.find((slot) => slot === s.chosen);
  if (lead === undefined) return fixed;
  return [lead, ...fixed.filter((slot) => slot !== lead)];
}

export type Wearer = 'woman' | 'man';
export const isRobesModelN = (v: unknown): v is RobesModelN =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;

export const robesModelId = (wearer: Wearer, n: RobesModelN): string =>
  `${wearer === 'man' ? 'm' : 'w'}-r${n}`;
export const robesModelIds = (wearer: Wearer): string[] =>
  ROBES_MODEL_NS.map((n) => robesModelId(wearer, n));

const ROBES_MODEL_ID = /^([wm])-r([1-5])$/;
export function parseRobesModelId(id: string): { gender: Wearer; n: RobesModelN } | null {
  const m = ROBES_MODEL_ID.exec(id);
  return m ? { gender: m[1] === 'm' ? 'man' : 'woman', n: Number(m[2]) as RobesModelN } : null;
}

// Every key the catalog takes: a picks cell at its style, or a Robes model at its own. Shared by
// the job input, the media key and (as text) the database check.
export const CATALOG_KEY =
  /^[wm]-(s[0-7]-h[0-5]-(hg|pe|re|it|ap|nt)(-(ll|lr|fl|fr))*|r[1-5])@v[0-9]+$/;
export const CATALOG_KEY_SQL = CATALOG_KEY.source;
export function catalogKey(cellId: string): string {
  return parseRobesModelId(cellId) ? `${cellId}@${ROBES_MODEL_STYLE}` : cellKey(cellId);
}
// Who a catalog cell is, from either grammar.
export function catalogGender(cellId: string): Wearer | null {
  return parseCellId(cellId)?.gender ?? parseRobesModelId(cellId)?.gender ?? null;
}

// What the twin prompt draws a Robes model from: the model's facts as a spec with no face.
export function robesModelSpec(cellId: string): TwinSpec | null {
  const parsed = parseRobesModelId(cellId);
  const m = parsed ? ROBES_MODELS[parsed.n - 1] : undefined;
  if (!parsed || !m) return null;
  return {
    gender: parsed.gender,
    heightCm: null,
    sizeUk: m.sizeUk,
    stops: m.stops,
    waistDiff: null,
    age: m.age,
    skin: m.skin,
    hair: m.hair,
    skinSet: false,
    hairSet: false,
    hasFace: false,
  };
}

// What her looks stand on (plan 2026-11-05 §2.3), from her model row. Her twin once it exists
// and she hasn't chosen a Robes model over it; else the cell she built by hand (legacy picks, no
// Robes model chosen); else the Robes model she chose, or the first.
export interface StandSource {
  genderIdentity: string | null;
  modelPreset: number | null;
  filedCellId: string | null;
  twinAssetId: string | null;
  twinKey: string | null;
}
export type Stand =
  | { on: 'twin' }
  | { on: 'cell'; cellId: string }
  | { on: 'robes'; cellId: string; n: RobesModelN };

export const wearerOf = (genderIdentity: string | null | undefined): Wearer =>
  genderIdentity === 'man' ? 'man' : 'woman';

export function standOf(s: StandSource): Stand {
  const n = isRobesModelN(s.modelPreset) ? s.modelPreset : null;
  if (n === null && s.twinAssetId && s.twinKey) return { on: 'twin' };
  if (n === null && s.filedCellId) return { on: 'cell', cellId: s.filedCellId };
  const chosen = n ?? 1;
  return { on: 'robes', cellId: robesModelId(wearerOf(s.genderIdentity), chosen), n: chosen };
}

// What a look's picture stood on, read from its render key (plan 2026-11-05 §2.4): a twin, a
// hand-built cell, or a Robes model (the five, or the three legacy generic cells). A frame's key
// names its rack, not its model, so a frame answers null here and is recorded when it lands.
export type StoodOn = Stand['on'];
export function stoodOnOf(renderKey: string | null | undefined): StoodOn | null {
  if (!renderKey) return null;
  if (renderKey.startsWith('twin:')) return 'twin';
  if (renderKey.startsWith('frame:')) return null;
  const key = renderKey.slice(0, renderKey.lastIndexOf(':'));
  const cellId = key.slice(0, key.lastIndexOf('@'));
  if (parseRobesModelId(cellId)) return 'robes';
  if (LEGACY_GENERIC_CELLS.has(cellId)) return 'robes';
  return parseCellId(cellId) ? 'cell' : null;
}
const LEGACY_GENERIC_CELLS = new Set(
  ['s4-h1-nt', 's1-h0-nt', 's7-h3-nt'].flatMap((c) => [`w-${c}`, `m-${c}`]),
);
