import { shade, shadeByName } from '../colour';
import { cropRegion } from '../photo-pieces';

// Add a piece, end to end (design "Add Piece — Handoff", 2026-10-26): every way in — the camera,
// the camera roll, a link — lands on one Review screen, and nothing files without a look. These
// are the pure rules both clients share; the screens are twins (web components/wardrobe/add,
// native features/wardrobe/add).

export const ADD_DESTINATIONS = ['wardrobe', 'wishlist'] as const;
export type AddDestination = (typeof ADD_DESTINATIONS)[number];

export function isDestination(value: unknown): value is AddDestination {
  return ADD_DESTINATIONS.includes(value as AddDestination);
}

// Review's scan: seven steps of 380ms. The line sweeps top to bottom over the first five, one
// tag pops in per step, and from the sixth the name caption shows and the rows resolve.
export const SCAN_STEPS = 7;
export const SCAN_STEP_MS = 380;
export const SCAN_READY_STEP = 6;

export function scanFrame(step: number): {
  lineTop: number;
  lineVisible: boolean;
  tagsShown: number;
  ready: boolean;
} {
  const s = Math.max(0, Math.min(SCAN_STEPS, Math.floor(step)));
  return {
    lineTop: Math.min(s, 5) * 20,
    lineVisible: s < SCAN_READY_STEP,
    tagsShown: s,
    ready: s >= SCAN_READY_STEP,
  };
}

// Review's photograph fills a 4:5 frame with the piece's own crop of her photo, centred (cover).
// In fractions of the frame: width and left of its width, height and top of its height.
export const SCAN_FRAME_RATIO = 1.25;

export function scanCover(photo: {
  width: number;
  height: number;
  box: { x: number; y: number; w: number; h: number };
}): { width: number; height: number; left: number; top: number } {
  const r = cropRegion(photo.box);
  const ratio = Math.max(1, photo.height) / Math.max(1, photo.width);
  let w = 1 / r.w;
  let h = w * ratio;
  if (h * r.h < SCAN_FRAME_RATIO) {
    h = SCAN_FRAME_RATIO / r.h;
    w = h / ratio;
  }
  return {
    width: w,
    height: h / SCAN_FRAME_RATIO,
    left: -r.x * w + (1 - r.w * w) / 2,
    top: (-r.y * h + (SCAN_FRAME_RATIO - r.h * h) / 2) / SCAN_FRAME_RATIO,
  };
}

// Where the tags sit on the photo, in percent of its frame, in the order they pop.
export const TAG_SPOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 6, y: 10 },
  { x: 62, y: 22 },
  { x: 8, y: 42 },
  { x: 60, y: 56 },
  { x: 6, y: 72 },
];

// The tags: category · type · brand · colour · name, de-duplicated (case-insensitive), at most
// one per spot.
export function scanTags(values: ReadonlyArray<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const v = raw?.trim();
    if (!v || out.some((t) => t.toLowerCase() === v.toLowerCase())) continue;
    out.push(v);
    if (out.length === TAG_SPOTS.length) break;
  }
  return out;
}

// What Review shows on its rows before she has touched anything: Robes' read, with the colour
// word resolved to a shade so the swatch and the drawer agree. A season is left unset, so the
// row reads "Add" until she answers it (filing then keeps the season Robes infers).
export interface ReadValues {
  label: string;
  brand: string | null;
  notes: string | null;
  categoryL2: string | null;
  categoryL3: string | null;
  color: string | null;
  price?: number | null;
  currency?: string | null;
  size?: string | null;
}

export function readDraft(read: ReadValues) {
  return {
    label: read.label,
    brand: read.brand,
    notes: read.notes,
    categoryL2: read.categoryL2,
    categoryL3: read.categoryL3,
    colourShade: shadeByName(read.color)?.id ?? null,
    colourExtra: [] as string[],
    print: null as string | null,
    material: null as string | null,
    seasonBand: null as 'spring_summer' | 'autumn_winter' | 'year_round' | null,
    wearFor: [] as string[],
    size: read.size ?? null,
    price: read.price ?? null,
    currency: read.currency ?? null,
  };
}

// The queue Review walks: one entry per piece found, grouped by what files it together (a read
// job files all its pieces in one call; a link files on its own).
export type ReviewAnswer = 'pending' | 'add' | 'skip';
export interface ReviewEntry<E> {
  key: string;
  group: string;
  index: number;
  answer: ReviewAnswer;
  edits?: E;
}

// After answering the piece at `from`: the next one still waiting, else the first one waiting
// anywhere, else null (everything is answered).
export function nextPending<E>(
  entries: ReadonlyArray<ReviewEntry<E>>,
  from: number,
): number | null {
  for (let i = from + 1; i < entries.length; i++) if (entries[i]?.answer === 'pending') return i;
  for (let i = 0; i < Math.min(from, entries.length); i++)
    if (entries[i]?.answer === 'pending') return i;
  return null;
}

// Groups whose every piece is answered and that haven't filed yet: each is one filing call.
// A group nothing was kept from still files (so its spare crops are let go).
export function readyGroups<E>(
  entries: ReadonlyArray<ReviewEntry<E>>,
  filed: ReadonlySet<string>,
): Array<{
  group: string;
  answers: Array<{ index: number; state: 'add' | 'skip'; edits?: E }>;
}> {
  const order: string[] = [];
  const byGroup = new Map<string, ReviewEntry<E>[]>();
  for (const e of entries) {
    if (filed.has(e.group)) continue;
    if (!byGroup.has(e.group)) {
      byGroup.set(e.group, []);
      order.push(e.group);
    }
    byGroup.get(e.group)?.push(e);
  }
  return order.flatMap((group) => {
    const items = byGroup.get(group) ?? [];
    if (items.some((e) => e.answer === 'pending')) return [];
    return [
      {
        group,
        answers: items.map((e) =>
          e.answer === 'add' && e.edits !== undefined
            ? { index: e.index, state: 'add' as const, edits: e.edits }
            : { index: e.index, state: e.answer as 'add' | 'skip' },
        ),
      },
    ];
  });
}

export function reviewTally<E>(entries: ReadonlyArray<ReviewEntry<E>>): {
  kept: number;
  skipped: number;
  pending: number;
} {
  const n = (a: ReviewAnswer) => entries.filter((e) => e.answer === a).length;
  return { kept: n('add'), skipped: n('skip'), pending: n('pending') };
}

// What she changed on Review's rows, as the drawers hand it back.
export interface RowChanges {
  label?: string;
  brand?: string | null;
  notes?: string | null;
  categoryL2?: string | null;
  categoryL3?: string | null;
  colourShade?: string | null;
  colourExtra?: string[];
  print?: string | null;
  material?: string | null;
  seasonBand?: 'spring_summer' | 'autumn_winter' | 'year_round';
  wearFor?: string[];
  size?: string | null;
  price?: number | null;
  currency?: string | null;
}

const ROW_KEYS = [
  'label',
  'brand',
  'notes',
  'categoryL2',
  'categoryL3',
  'colourShade',
  'colourExtra',
  'print',
  'material',
  'seasonBand',
  'wearFor',
  'size',
  'price',
  'currency',
] as const;

// Only the fields a drawer can set, so nothing else a save carries (the star) rides along.
export function rowChanges(input: Record<string, unknown>): RowChanges {
  const out: Record<string, unknown> = {};
  for (const k of ROW_KEYS) if (input[k] !== undefined) out[k] = input[k];
  return out as RowChanges;
}

// A kept piece's edits for filing: always its name (she may have left Robes' one), plus exactly
// what she changed — an untouched field keeps Robes' read.
export function fileEdits(label: string, changes: RowChanges): RowChanges & { label: string } {
  return { ...changes, label: changes.label ?? label };
}

// The same changes for a wish: its note is `note`, and season and wear-for are the wardrobe's.
export function wishChanges(changes: RowChanges) {
  const { notes, seasonBand: _s, wearFor: _w, ...rest } = changes;
  return notes === undefined ? rest : { ...rest, note: notes };
}

// A piece added by hand is named for her if she leaves the name blank (redline 07): its colour
// and the most specific category she chose — "Navy crew-neck jumper". Null until a category.
export function suggestName(values: {
  categoryL2: string | null;
  categoryL3: string | null;
  colourShade: string | null;
}): string | null {
  const kind = values.categoryL3 ?? values.categoryL2;
  if (!kind) return null;
  const colour = shade(values.colourShade)?.name;
  if (!colour) return kind.charAt(0).toUpperCase() + kind.slice(1);
  return `${colour} ${kind.charAt(0).toLowerCase()}${kind.slice(1)}`;
}
