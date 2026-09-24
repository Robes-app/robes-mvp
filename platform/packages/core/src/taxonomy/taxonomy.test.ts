import { describe, expect, it } from 'vitest';
import {
  defaultTagsFor,
  resolveTaxonomy,
  TAXONOMY_GROUPS,
  tagDefaultRows,
  taxonomyPromptBlock,
  taxonomyRows,
} from './index';

describe('taxonomy', () => {
  it('matches the 2026-07-31 sheet shape', () => {
    expect(TAXONOMY_GROUPS).toHaveLength(64);
    expect(taxonomyRows()).toHaveLength(350);
    expect(new Set(TAXONOMY_GROUPS.map((g) => g.l2)).size).toBe(55);
    expect(new Set(TAXONOMY_GROUPS.map((g) => g.sheetL1)).size).toBe(14);
  });

  it('has unique (l2, l3) pairs, the table primary key', () => {
    const keys = taxonomyRows().map((r) => `${r.l2}|${r.l3}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves case-insensitively and folds split l2s by l3', () => {
    expect(resolveTaxonomy('jeans', 'MOM JEANS')).toEqual({
      category: 'Bottoms',
      categoryL2: 'Jeans',
      categoryL3: 'Mom jeans',
    });
    expect(resolveTaxonomy('Cardigans', 'Cardigan coat / coatigan')?.category).toBe('Outerwear');
    expect(resolveTaxonomy('Cardigans', 'Cropped cardigan')?.category).toBe('Tops');
  });

  it('degrades an unknown l3 to the l2 and rejects an unknown l2', () => {
    expect(resolveTaxonomy('Jeans', 'Hovercraft')).toEqual({
      category: 'Bottoms',
      categoryL2: 'Jeans',
      categoryL3: null,
    });
    expect(resolveTaxonomy('Spacesuits', 'x')).toBeNull();
  });

  it('builds the prompt block one line per group', () => {
    expect(taxonomyPromptBlock().split('\n')).toHaveLength(64);
  });
});

describe('tag defaults', () => {
  it('emits the 71 seed rows the legacy trigger used', () => {
    const rows = tagDefaultRows();
    expect(rows).toHaveLength(71);
    expect(rows[0]).toEqual({
      sheetL1: 'Tops',
      l2: null,
      seasonBand: 'year_round',
      wearSlugs: ['everyday'],
    });
  });

  it('applies l2 overrides and legacy fallbacks', () => {
    expect(defaultTagsFor('Outerwear', 'Blazers')).toEqual({
      wear: ['work', 'everyday'],
      band: 'year_round',
    });
    expect(defaultTagsFor('Outerwear', 'Coats')?.band).toBe('autumn_winter');
    expect(defaultTagsFor('Swimwear')).toEqual({ wear: ['travel'], band: 'spring_summer' });
    expect(defaultTagsFor('Other')).toBeNull();
  });
});
