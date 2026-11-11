import { shadeByName } from '../colour';
import { defaultTagsFor, sheetL1For, WEAR_SEEDS } from '../taxonomy';

// Add a piece, end to end (design "Add Piece — Handoff", 2026-10-26): every way in — the camera,
// the camera roll, a link — lands on one Review screen, and nothing files without a look. These
// are the pure rules both clients share; the screens are twins (web components/wardrobe/add,
// native features/wardrobe/add).

export const ADD_DESTINATIONS = ['wardrobe', 'wishlist'] as const;
export type AddDestination = (typeof ADD_DESTINATIONS)[number];

export function isDestination(value: unknown): value is AddDestination {
  return ADD_DESTINATIONS.includes(value as AddDestination);
}

// What Review shows on its rows before she has touched anything: Robes' read, with the colour
// word resolved to a shade so the swatch and the drawer agree. The season and wear-for stay unset
// here — filing applies the category's defaults (apply_tag_defaults) — and `withTagDefaults`
// shows those defaults on the rows meanwhile, as legacy's add form previewed them.
export interface ReadValues {
  label: string;
  brand: string | null;
  notes: string | null;
  categoryL2: string | null;
  categoryL3: string | null;
  color: string | null;
  colourShade?: string | null;
  colourExtra?: readonly string[];
  print?: string | null;
  material?: string | null;
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
    colourShade: read.colourShade ?? shadeByName(read.color)?.id ?? null,
    colourExtra: [...(read.colourExtra ?? [])],
    print: read.print ?? null,
    material: read.material ?? null,
    seasonBand: null as 'spring_summer' | 'autumn_winter' | 'year_round' | null,
    wearFor: [] as string[],
    size: read.size ?? null,
    price: read.price ?? null,
    currency: read.currency ?? null,
  };
}

// ── Review as a list (Capture PRD 3c.3–3c.5, 10 Nov 2026) ───────────────────────────────────
// Several photographs are reviewed together: a list she removes from and opens a piece out of,
// then one "Add N to wardrobe". With one piece the list is that piece's own page; with none left
// she is back at the camera.
export type ReviewScreen =
  | { kind: 'camera' }
  | { kind: 'list'; count: number }
  // `key` is null while the one photograph is still being read.
  | { kind: 'single'; key: string | null }
  | { kind: 'piece'; key: string; at: number; of: number };

export function reviewScreen(s: {
  // The pieces still on the list, in order.
  keys: readonly string[];
  // Photographs whose read has not landed yet (each shows a "Reading the details…" row).
  reading: number;
  // The piece she opened from the list, if any.
  open: string | null;
}): ReviewScreen {
  const count = s.keys.length + s.reading;
  if (count === 0) return { kind: 'camera' };
  if (count === 1) return { kind: 'single', key: s.keys[0] ?? null };
  const at = s.open ? s.keys.indexOf(s.open) : -1;
  if (s.open && at >= 0) return { kind: 'piece', key: s.open, at: at + 1, of: count };
  return { kind: 'list', count };
}

// "Add N to wardrobe": one filing call per group (a read files all its pieces at once), the
// pieces she kept added with her edits and the ones she removed skipped, so their crops are let
// go. A group with nothing kept still files, for the same reason.
export function bulkGroups<E>(
  entries: ReadonlyArray<{ key: string; group: string; index: number }>,
  removed: ReadonlySet<string>,
  changes: Readonly<Record<string, E | undefined>>,
): Array<{
  group: string;
  answers: Array<{ index: number; state: 'add' | 'skip'; edits?: E }>;
}> {
  const order: string[] = [];
  const byGroup = new Map<string, Array<{ index: number; state: 'add' | 'skip'; edits?: E }>>();
  for (const e of entries) {
    if (!byGroup.has(e.group)) {
      byGroup.set(e.group, []);
      order.push(e.group);
    }
    const edits = changes[e.key];
    byGroup
      .get(e.group)
      ?.push(
        removed.has(e.key)
          ? { index: e.index, state: 'skip' }
          : { index: e.index, state: 'add', ...(edits !== undefined ? { edits } : {}) },
      );
  }
  return order.map((group) => ({ group, answers: byGroup.get(group) ?? [] }));
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

// The rows' view of a draft: an unanswered season and wear-for read as the defaults her category
// files with, so Review shows "Year-round · Everyday" rather than "Optional". Display only — the
// draft itself stays unset, so filing still lets the database infer them.
export function withTagDefaults<
  V extends { categoryL2: string | null; seasonBand: string | null; wearFor: readonly string[] },
>(values: V): V {
  if (values.seasonBand && values.wearFor.length) return values;
  const l2 = values.categoryL2;
  const d = l2 ? defaultTagsFor(sheetL1For(l2), l2) : null;
  if (!d) return values;
  const label = (slug: string) => WEAR_SEEDS.find((w) => w.slug === slug)?.label ?? slug;
  return {
    ...values,
    seasonBand: values.seasonBand ?? d.band,
    wearFor: values.wearFor.length ? values.wearFor : d.wear.map(label),
  };
}
