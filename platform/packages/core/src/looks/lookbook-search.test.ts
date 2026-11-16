import { describe, expect, it } from 'vitest';
import { LOOKBOOK_SEARCH_FROM, showLookbookSearch } from './index';

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
