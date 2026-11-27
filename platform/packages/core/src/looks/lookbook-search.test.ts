import { describe, expect, it } from 'vitest';
import { LOOKBOOK_SEARCH_FROM, lookbookCounts, showLookbookSearch } from './index';

// Annie, 16 Nov: the Lookbook's search stands once there is enough to search.
describe('showLookbookSearch', () => {
  it('stands from 50 saved looks, or while words are in it', () => {
    expect(LOOKBOOK_SEARCH_FROM).toBe(50);
    expect(showLookbookSearch(49, '')).toBe(false);
    expect(showLookbookSearch(50, '')).toBe(true);
    expect(showLookbookSearch(3, 'linen')).toBe(true);
    expect(showLookbookSearch(3, '  ')).toBe(false);
  });
});

describe('lookbookCounts', () => {
  it('counts a tab that holds looks, and the tab in view even when empty', () => {
    expect(lookbookCounts('suggested', 0, 10)).toEqual({ suggested: 10 });
    expect(lookbookCounts('suggested', 1, 9)).toEqual({ saved: 1, suggested: 9 });
    expect(lookbookCounts('suggested', 3, 0)).toEqual({ saved: 3, suggested: 0 });
    expect(lookbookCounts('saved', 0, 0)).toEqual({ saved: 0 });
    expect(lookbookCounts('saved', undefined, 4)).toEqual({ suggested: 4 });
  });
});
