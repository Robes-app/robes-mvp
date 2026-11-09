// The shared filter pattern (Front Door PRD rev 3 §2.5): one filter state for the Pick sheet,
// the Lookbook and the Wardrobe, the season rule, and faceted counts. Pure, shared by both clients.

import { lookMatches, lookWearFor } from '../looks';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

// What the SEASON section offers: the four seasons and Year round, which is the empty set (Felix
// rebuild D12): a look or piece for every season carries none.
export const YEAR_ROUND = 'year_round';
export const SEASON_OPTIONS = [...SEASONS, YEAR_ROUND] as const;
export type SeasonOption = (typeof SEASON_OPTIONS)[number];

// One wear-it-for list for looks and pieces (plan R6): the seeds plus Weekend, which a filter
// can name before any piece carries it (a tag row is minted on first use, never pre-created).
export const WEAR_FOR_ALL = [
  'Everyday',
  'Work',
  'Weekend',
  'Evening',
  'Occasion',
  'Travel',
  'Active',
  'Lounge',
] as const;
// The quick chips after All; the rest live in the sheet and join the row once picked.
export const WEAR_FOR_QUICK = ['Everyday', 'Work', 'Weekend', 'Evening', 'Active'] as const;

export interface LookFilterState {
  query: string;
  seasons: readonly SeasonOption[];
  wearFor: readonly string[];
}

export const EMPTY_LOOK_FILTERS: LookFilterState = { query: '', seasons: [], wearFor: [] };

export function hasLookFilters(state: LookFilterState): boolean {
  return state.query.trim() !== '' || state.seasons.length > 0 || state.wearFor.length > 0;
}

// The season rule: an item with no season set (Year round) matches any season filter; picking
// Year round returns the items that carry none; otherwise the item and the picks must meet.
export function matchesSeasons(
  itemSeasons: readonly string[] | null | undefined,
  picked: readonly SeasonOption[],
): boolean {
  if (picked.length === 0) return true;
  const seasons = itemSeasons ?? [];
  if (seasons.length === 0) return true;
  return picked.some((p) => p !== YEAR_ROUND && seasons.includes(p));
}

const fold = (s: string) => s.trim().toLowerCase();

// Values are compared without case: her tag "work" and the seed "Work" are one word.
export function matchesWearFor(itemWearFor: readonly string[], picked: readonly string[]): boolean {
  if (picked.length === 0) return true;
  const have = new Set(itemWearFor.map(fold));
  return picked.some((p) => have.has(fold(p)));
}

export function toggleValue<T extends string>(list: readonly T[], value: T): T[] {
  return list.some((v) => fold(v) === fold(value))
    ? list.filter((v) => fold(v) !== fold(value))
    : [...list, value];
}

// What the Filter button counts (PRD §2.5): the seasons picked plus the wear-it-for values that
// are not quick chips (Travel, Lounge, Occasion, her own tags). Quick chips show their own state.
export function sheetFilterCount(
  state: Pick<LookFilterState, 'seasons' | 'wearFor'>,
  quick: readonly string[] = WEAR_FOR_QUICK,
): number {
  const q = new Set(quick.map(fold));
  return state.seasons.length + state.wearFor.filter((w) => !q.has(fold(w))).length;
}

// The wear-it-for values picked in the sheet that are not quick chips: they join the quick-chip
// row as active chips, so they stay visible and removable.
export function extraActive(
  state: Pick<LookFilterState, 'wearFor'>,
  quick: readonly string[] = WEAR_FOR_QUICK,
): string[] {
  const q = new Set(quick.map(fold));
  return state.wearFor.filter((w) => !q.has(fold(w)));
}

export interface Filterable {
  seasons?: readonly string[] | null;
  wearFor: readonly string[];
  matchesQuery: (query: string) => boolean;
}

export function applyFilters<T extends Filterable>(
  items: readonly T[],
  state: LookFilterState,
): T[] {
  const q = state.query.trim();
  return items.filter(
    (item) =>
      (q === '' || item.matchesQuery(q)) &&
      matchesSeasons(item.seasons, state.seasons) &&
      matchesWearFor(item.wearFor, state.wearFor),
  );
}

// Faceted counts: each option counted against the search and the OTHER section's picks, so she
// sees what a tap would return. Within a section the values are OR'd, so a section's own picks
// are left out of its counts.
export function seasonCounts<T extends Filterable>(
  items: readonly T[],
  state: LookFilterState,
): Record<SeasonOption, number> {
  const base = applyFilters(items, { ...state, seasons: [] });
  const counts = Object.fromEntries(SEASON_OPTIONS.map((s) => [s, 0])) as Record<
    SeasonOption,
    number
  >;
  for (const item of base) {
    const seasons = item.seasons ?? [];
    // An untagged item is Year round, and it answers every season (the rule above).
    if (seasons.length === 0) {
      for (const s of SEASON_OPTIONS) counts[s] += 1;
      continue;
    }
    for (const s of SEASONS) if (seasons.includes(s)) counts[s] += 1;
  }
  return counts;
}

export function wearForCounts<T extends Filterable>(
  items: readonly T[],
  state: LookFilterState,
  options: readonly string[],
): Record<string, number> {
  const base = applyFilters(items, { ...state, wearFor: [] });
  const counts: Record<string, number> = {};
  for (const option of options) {
    counts[option] = base.filter((item) => matchesWearFor(item.wearFor, [option])).length;
  }
  return counts;
}

// The WEAR IT FOR options a set of items offers: the shared list, then her own tags found on
// them, A–Z, each spelling once.
export function wearForChoices(items: readonly { wearFor: readonly string[] }[]): string[] {
  const seen = new Set(WEAR_FOR_ALL.map(fold));
  const own: string[] = [];
  for (const item of items) {
    for (const tag of item.wearFor) {
      const key = fold(tag);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      own.push(tag.trim());
    }
  }
  return [...WEAR_FOR_ALL, ...own.sort((a, b) => a.localeCompare(b, 'en-GB'))];
}

// A look as the filters read it: its seasons, its Wear it for (her tags, else its pieces'), and
// a search over its name and its pieces' labels and brands.
export function lookFacets<
  T extends {
    name: string;
    seasons?: readonly string[] | null;
    tags?: readonly string[];
    pieces: readonly {
      piece: { label: string; brand?: string | null; wearFor?: readonly string[] };
    }[];
  },
>(look: T): T & Filterable {
  return {
    ...look,
    seasons: look.seasons ?? [],
    wearFor: lookWearFor(look),
    matchesQuery: (q: string) => lookMatches(look, q),
  };
}
