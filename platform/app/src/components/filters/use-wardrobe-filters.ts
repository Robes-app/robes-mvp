'use client';

import type { ListPiecesInput } from '@robes/contracts';
import { type SeasonOption, toggleValue } from '@robes/core/filters';
import { useCallback, useMemo, useState } from 'react';

// The wardrobe's filter state (Front Door PRD rev 3 §7.1a): category from the quick chips (one at
// a time), then the sheet's seasons, wear-it-for and colour families (several each) and one brand.
// Applied live, server-side: `input` is what `wardrobe.list` and `wardrobe.summary` take. Twin of
// native features/filters/use-wardrobe-filters.ts.
export interface WardrobeFilterState {
  category: string | null;
  seasons: readonly SeasonOption[];
  wearFor: readonly string[];
  families: readonly string[];
  brand: string | null;
}

export const EMPTY_WARDROBE_FILTERS: WardrobeFilterState = {
  category: null,
  seasons: [],
  wearFor: [],
  families: [],
  brand: null,
};

export type WardrobeFilterInput = Pick<
  ListPiecesInput,
  'category' | 'seasons' | 'wearFor' | 'colourFamilies' | 'brand'
>;

export function wardrobeFilterInput(state: WardrobeFilterState): WardrobeFilterInput {
  return {
    ...(state.category ? { category: state.category as ListPiecesInput['category'] } : {}),
    ...(state.seasons.length ? { seasons: [...state.seasons] } : {}),
    ...(state.wearFor.length ? { wearFor: [...state.wearFor] } : {}),
    ...(state.families.length ? { colourFamilies: [...state.families] } : {}),
    ...(state.brand ? { brand: state.brand } : {}),
  };
}

// What the Filter button counts: the sheet's picks (the category chips show their own state).
export function wardrobeSheetCount(state: WardrobeFilterState): number {
  return (
    state.seasons.length + state.wearFor.length + state.families.length + (state.brand ? 1 : 0)
  );
}

export function useWardrobeFilters() {
  const [state, setState] = useState<WardrobeFilterState>(EMPTY_WARDROBE_FILTERS);
  const setCategory = useCallback(
    (category: string | null) =>
      setState((s) => ({ ...s, category: s.category === category ? null : category })),
    [],
  );
  const toggleSeason = useCallback(
    (season: SeasonOption) => setState((s) => ({ ...s, seasons: toggleValue(s.seasons, season) })),
    [],
  );
  const toggleWear = useCallback(
    (value: string) => setState((s) => ({ ...s, wearFor: toggleValue(s.wearFor, value) })),
    [],
  );
  const toggleFamily = useCallback(
    (family: string) => setState((s) => ({ ...s, families: toggleValue(s.families, family) })),
    [],
  );
  const setBrand = useCallback((brand: string | null) => setState((s) => ({ ...s, brand })), []);
  // Clear resets the sheet's four sections; the category chip stays hers.
  const clearSheet = useCallback(
    () => setState((s) => ({ ...EMPTY_WARDROBE_FILTERS, category: s.category })),
    [],
  );
  const clear = useCallback(() => setState(EMPTY_WARDROBE_FILTERS), []);
  const input = useMemo(() => wardrobeFilterInput(state), [state]);
  // The sheet's filters alone (the category set aside): what the category chips count under.
  const sheetInput = useMemo(() => wardrobeFilterInput({ ...state, category: null }), [state]);
  const sheetCount = wardrobeSheetCount(state);
  return {
    state,
    input,
    sheetInput,
    sheetCount,
    active: sheetCount > 0 || state.category !== null,
    setCategory,
    toggleSeason,
    toggleWear,
    toggleFamily,
    setBrand,
    clearSheet,
    clear,
  };
}

export type WardrobeFilters = ReturnType<typeof useWardrobeFilters>;
