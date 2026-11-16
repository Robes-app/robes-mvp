import type { ListPiecesInput } from '@robes/contracts';
import { type SeasonOption, toggleValue } from '@robes/core/filters';
import { useCallback, useEffect, useMemo, useState } from 'react';

// The wardrobe's filter state (Front Door PRD rev 3 §7.1a): category from the quick chips (one at
// a time), then the sheet's seasons, wear-it-for and colour families (several each) and one brand.
// Applied live, server-side: `input` is what `wardrobe.list` and `wardrobe.summary` take. Twin of
// web components/filters/use-wardrobe-filters.ts.
export interface WardrobeFilterState {
  category: string | null;
  seasons: readonly SeasonOption[];
  wearFor: readonly string[];
  families: readonly string[];
  brand: string | null;
  // The search field's words (Robes MVP 3b), as she types them.
  query: string;
}

export const EMPTY_WARDROBE_FILTERS: WardrobeFilterState = {
  category: null,
  seasons: [],
  wearFor: [],
  families: [],
  brand: null,
  query: '',
};

export type WardrobeFilterInput = Pick<
  ListPiecesInput,
  'category' | 'seasons' | 'wearFor' | 'colourFamilies' | 'brand' | 'q'
>;

export function wardrobeFilterInput(state: WardrobeFilterState): WardrobeFilterInput {
  return {
    ...(state.category ? { category: state.category as ListPiecesInput['category'] } : {}),
    ...(state.seasons.length ? { seasons: [...state.seasons] } : {}),
    ...(state.wearFor.length ? { wearFor: [...state.wearFor] } : {}),
    ...(state.families.length ? { colourFamilies: [...state.families] } : {}),
    ...(state.brand ? { brand: state.brand } : {}),
    ...(state.query.trim() ? { q: state.query.trim().slice(0, 80) } : {}),
  };
}

// The search reaches the server once she pauses, not on every letter.
const SEARCH_PAUSE_MS = 250;
function usePaused<T>(value: T): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
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
  const setQuery = useCallback((query: string) => setState((s) => ({ ...s, query })), []);
  // Clear resets the sheet's four sections; the category chip and her search stay hers.
  const clearSheet = useCallback(
    () => setState((s) => ({ ...EMPTY_WARDROBE_FILTERS, category: s.category, query: s.query })),
    [],
  );
  const clear = useCallback(() => setState(EMPTY_WARDROBE_FILTERS), []);
  const query = usePaused(state.query);
  const input = useMemo(() => wardrobeFilterInput({ ...state, query }), [state, query]);
  // The sheet's filters alone (the category set aside): what the category chips count under.
  const sheetInput = useMemo(
    () => wardrobeFilterInput({ ...state, query, category: null }),
    [state, query],
  );
  const sheetCount = wardrobeSheetCount(state);
  return {
    state,
    input,
    sheetInput,
    sheetCount,
    active: sheetCount > 0 || state.category !== null || state.query.trim() !== '',
    setCategory,
    toggleSeason,
    toggleWear,
    toggleFamily,
    setBrand,
    setQuery,
    clearSheet,
    clear,
  };
}

export type WardrobeFilters = ReturnType<typeof useWardrobeFilters>;
