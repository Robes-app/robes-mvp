import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  EMPTY_LOOK_FILTERS,
  extraActive,
  type Filterable,
  hasLookFilters,
  matchesSeasons,
  seasonCounts,
  sheetFilterCount,
  toggleValue,
  wearForChoices,
  wearForCounts,
} from './index';

// The PRD's seed library (§9): six looks with their seasons, wear-it-for and piece words.
const look = (
  name: string,
  seasons: string[],
  wearFor: string[],
  words: string,
): Filterable & { name: string } => ({
  name,
  seasons,
  wearFor,
  matchesQuery: (q) => `${name} ${words}`.toLowerCase().includes(q.toLowerCase()),
});
const LIBRARY = [
  look('The Thursday one', ['autumn', 'winter'], ['Work'], 'coat trousers loafers'),
  look('Office, sharpened', [], ['Work'], 'blazer shirt trousers'),
  look('Saturday, undone', ['spring', 'summer'], ['Weekend', 'Everyday'], 'jeans tee trainers'),
  look('Knit, loafers, long coat', ['autumn', 'winter'], ['Everyday'], 'knit loafers coat'),
  look('Wool under a trench', ['autumn', 'winter'], ['Travel'], 'trench wool knit'),
  look('Whites, a loose blazer', ['spring', 'summer'], ['Evening'], 'blazer white trousers'),
];
const names = (items: readonly { name: string }[]) => items.map((l) => l.name);

describe('the season rule', () => {
  it('lets an untagged (Year round) item through any season, and Year round returns the untagged', () => {
    expect(matchesSeasons([], ['autumn'])).toBe(true);
    expect(matchesSeasons(null, ['winter'])).toBe(true);
    expect(matchesSeasons(['spring'], ['year_round'])).toBe(false);
    expect(matchesSeasons([], ['year_round'])).toBe(true);
    expect(matchesSeasons(['spring', 'summer'], ['autumn'])).toBe(false);
    expect(matchesSeasons(['spring', 'summer'], ['autumn', 'summer'])).toBe(true);
    expect(matchesSeasons(['spring'], [])).toBe(true);
  });
});

describe('applyFilters (PRD §10 4a)', () => {
  it('Autumn + Travel shows only "Wool under a trench"', () => {
    const out = applyFilters(LIBRARY, { query: '', seasons: ['autumn'], wearFor: ['Travel'] });
    expect(names(out)).toEqual(['Wool under a trench']);
  });

  it('a quick chip filters live and the search narrows by title and piece words', () => {
    expect(names(applyFilters(LIBRARY, { ...EMPTY_LOOK_FILTERS, wearFor: ['Work'] }))).toEqual([
      'The Thursday one',
      'Office, sharpened',
    ]);
    expect(names(applyFilters(LIBRARY, { ...EMPTY_LOOK_FILTERS, query: 'loafers' }))).toEqual([
      'The Thursday one',
      'Knit, loafers, long coat',
    ]);
    expect(names(applyFilters(LIBRARY, { ...EMPTY_LOOK_FILTERS, query: 'thursday' }))).toEqual([
      'The Thursday one',
    ]);
  });

  it('compares wear-it-for without case', () => {
    expect(applyFilters(LIBRARY, { ...EMPTY_LOOK_FILTERS, wearFor: ['work'] })).toHaveLength(2);
  });
});

describe('faceted counts', () => {
  it('counts each option against the search and the other section', () => {
    const none = seasonCounts(LIBRARY, EMPTY_LOOK_FILTERS);
    // Three autumn/winter looks plus the untagged "Office, sharpened", which answers every season.
    expect(none).toEqual({ spring: 3, summer: 3, autumn: 4, winter: 4, year_round: 1 });
    const withTravel = seasonCounts(LIBRARY, { ...EMPTY_LOOK_FILTERS, wearFor: ['Travel'] });
    expect(withTravel).toEqual({ spring: 0, summer: 0, autumn: 1, winter: 1, year_round: 0 });
    const wear = wearForCounts(LIBRARY, EMPTY_LOOK_FILTERS, [
      'Everyday',
      'Work',
      'Weekend',
      'Evening',
      'Active',
    ]);
    expect(wear).toEqual({ Everyday: 2, Work: 2, Weekend: 1, Evening: 1, Active: 0 });
    // A section's own picks never narrow its counts: with Autumn picked, Travel still reads 1.
    const wearAutumn = wearForCounts(LIBRARY, { ...EMPTY_LOOK_FILTERS, seasons: ['autumn'] }, [
      'Work',
      'Travel',
      'Weekend',
    ]);
    expect(wearAutumn).toEqual({ Work: 2, Travel: 1, Weekend: 0 });
  });
});

describe('the filter button and the row', () => {
  it('counts seasons and sheet-only values, and appends those values to the row', () => {
    const state = { query: '', seasons: ['autumn' as const], wearFor: ['Work', 'Travel'] };
    expect(sheetFilterCount(state)).toBe(2);
    expect(extraActive(state)).toEqual(['Travel']);
    expect(hasLookFilters(EMPTY_LOOK_FILTERS)).toBe(false);
    expect(hasLookFilters({ ...EMPTY_LOOK_FILTERS, query: ' a ' })).toBe(true);
  });

  it('toggles a value once, whatever its case', () => {
    expect(toggleValue(['Work'], 'work')).toEqual([]);
    expect(toggleValue(['Work'], 'Travel')).toEqual(['Work', 'Travel']);
  });

  it('offers the shared list, then her own tags once each, A–Z', () => {
    expect(
      wearForChoices([{ wearFor: ['Gallery', 'work'] }, { wearFor: ['gallery', 'Brunch'] }]),
    ).toEqual([
      'Everyday',
      'Work',
      'Weekend',
      'Evening',
      'Occasion',
      'Travel',
      'Active',
      'Lounge',
      'Brunch',
      'Gallery',
    ]);
  });
});
