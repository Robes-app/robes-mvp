'use client';

import { filters as copy } from '@robes/copy';
import {
  applyFilters,
  EMPTY_LOOK_FILTERS,
  extraActive,
  type Filterable,
  hasLookFilters,
  type LookFilterState,
  SEASON_OPTIONS,
  type SeasonOption,
  seasonCounts,
  sheetFilterCount,
  toggleValue,
  WEAR_FOR_QUICK,
  wearForChoices,
  wearForCounts,
} from '@robes/core/filters';
import { useCallback, useMemo, useState } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

// One filter state for a list of looks (Front Door PRD rev 3 §2.5), and everything the row and
// the sheet draw from it: the filtered list, the quick chips with live counts, the sheet's faceted
// sections, the Filter button's count. Twin of native features/filters/use-look-filters.ts.
export function useLookFilters<T extends Filterable>(items: readonly T[]) {
  const [state, setState] = useState<LookFilterState>(EMPTY_LOOK_FILTERS);
  const setQuery = useCallback((query: string) => setState((s) => ({ ...s, query })), []);
  const toggleSeason = useCallback(
    (season: SeasonOption) => setState((s) => ({ ...s, seasons: toggleValue(s.seasons, season) })),
    [],
  );
  const toggleWear = useCallback(
    (value: string) => setState((s) => ({ ...s, wearFor: toggleValue(s.wearFor, value) })),
    [],
  );
  const clearWear = useCallback(() => setState((s) => ({ ...s, wearFor: [] })), []);
  const clear = useCallback(() => setState(EMPTY_LOOK_FILTERS), []);

  const filtered = useMemo(() => applyFilters(items, state), [items, state]);
  const wearChoices = useMemo(() => wearForChoices(items), [items]);
  const wearCounts = useMemo(
    () => wearForCounts(items, state, wearChoices),
    [items, state, wearChoices],
  );
  const seasons = useMemo(() => seasonCounts(items, state), [items, state]);

  // The quick chips: the defaults, then any sheet-only value she picked, so it stays visible.
  const quick: FilterOption[] = useMemo(
    () =>
      [...WEAR_FOR_QUICK, ...extraActive(state)].map((value) => ({
        value,
        label: value,
        count: wearCounts[value] ?? 0,
      })),
    [state, wearCounts],
  );
  const allCount = useMemo(
    () => applyFilters(items, { ...state, wearFor: [] }).length,
    [items, state],
  );
  const seasonSection: FilterOption[] = useMemo(
    () =>
      SEASON_OPTIONS.map((value) => ({
        value,
        label: copy.seasons[value],
        count: seasons[value],
      })),
    [seasons],
  );
  const wearSection: FilterOption[] = useMemo(
    () => wearChoices.map((value) => ({ value, label: value, count: wearCounts[value] ?? 0 })),
    [wearChoices, wearCounts],
  );

  return {
    state,
    filtered,
    quick,
    allCount,
    seasonSection,
    wearSection,
    sheetCount: sheetFilterCount(state),
    active: hasLookFilters(state),
    setQuery,
    toggleSeason,
    toggleWear,
    clearWear,
    clear,
  };
}

export type LookFilters = ReturnType<typeof useLookFilters>;
