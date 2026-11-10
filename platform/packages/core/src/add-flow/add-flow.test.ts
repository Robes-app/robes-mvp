import { describe, expect, it } from 'vitest';
import {
  bulkGroups,
  fileEdits,
  isDestination,
  readDraft,
  reviewScreen,
  rowChanges,
  wishChanges,
  withTagDefaults,
} from '.';

describe('add flow', () => {
  it('knows the two destinations', () => {
    expect(isDestination('wardrobe')).toBe(true);
    expect(isDestination('wishlist')).toBe(true);
    expect(isDestination('mine')).toBe(false);
  });

  it("drafts Review's rows from Robes' read, the colour word as a shade", () => {
    const draft = readDraft({
      label: 'Wool overcoat',
      brand: null,
      notes: null,
      categoryL2: null,
      categoryL3: null,
      color: 'Navy',
    });
    expect(draft).toMatchObject({
      label: 'Wool overcoat',
      colourShade: 'navy',
      seasonBand: null,
      wearFor: [],
      price: null,
    });
    expect(readDraft({ ...draft, color: null, colourShade: null }).colourShade).toBeNull();
  });

  it("keeps the read's shade, extra shades, print and material", () => {
    const draft = readDraft({
      label: 'White lace blouse',
      brand: 'Sézane',
      notes: null,
      categoryL2: 'Shirts & blouses',
      categoryL3: 'Blouse',
      color: 'Optic white',
      colourShade: 'optic',
      colourExtra: ['cream'],
      print: 'other',
      material: 'cotton',
    });
    expect(draft).toMatchObject({
      colourShade: 'optic',
      colourExtra: ['cream'],
      print: 'other',
      material: 'cotton',
    });
  });

  it('shows the category defaults on unanswered season and wear-for rows, never over hers', () => {
    const blazer = { categoryL2: 'Blazers', seasonBand: null, wearFor: [] as string[] };
    expect(withTagDefaults(blazer)).toEqual({
      categoryL2: 'Blazers',
      seasonBand: 'year_round',
      wearFor: ['Work', 'Everyday'],
    });
    expect(
      withTagDefaults({ ...blazer, seasonBand: 'spring_summer', wearFor: ['Evening'] }),
    ).toEqual({ categoryL2: 'Blazers', seasonBand: 'spring_summer', wearFor: ['Evening'] });
    expect(withTagDefaults({ ...blazer, categoryL2: null })).toEqual({
      ...blazer,
      categoryL2: null,
    });
  });
});

describe('Review edits', () => {
  it('keeps only what a drawer can set', () => {
    expect(rowChanges({ hero: true, heroPosition: 2, brand: 'COS', label: undefined })).toEqual({
      brand: 'COS',
    });
  });

  it('files her name, else Robes’, and exactly what she changed', () => {
    expect(fileEdits('Wool overcoat', {})).toEqual({ label: 'Wool overcoat' });
    expect(fileEdits('Wool overcoat', { label: 'Camel coat', material: 'wool' })).toEqual({
      label: 'Camel coat',
      material: 'wool',
    });
  });

  it('reshapes a wish: notes become its note, the wardrobe-only fields stay behind', () => {
    expect(
      wishChanges({ notes: 'Size up', seasonBand: 'year_round', wearFor: ['Work'], size: 'M' }),
    ).toEqual({ note: 'Size up', size: 'M' });
    expect(wishChanges({ brand: 'COS' })).toEqual({ brand: 'COS' });
  });
});

describe('review as a list (Capture PRD 3c)', () => {
  it('is the list with two or more, the piece itself with one, the camera with none', () => {
    expect(reviewScreen({ keys: ['a', 'b'], reading: 0, open: null })).toEqual({
      kind: 'list',
      count: 2,
    });
    // Removing down to one switches to that piece's own page.
    expect(reviewScreen({ keys: ['b'], reading: 0, open: null })).toEqual({
      kind: 'single',
      key: 'b',
    });
    // Removing the last returns to the camera.
    expect(reviewScreen({ keys: [], reading: 0, open: null })).toEqual({ kind: 'camera' });
  });

  it('counts photographs still being read, and holds the single page while one reads', () => {
    expect(reviewScreen({ keys: ['a'], reading: 2, open: null })).toEqual({
      kind: 'list',
      count: 3,
    });
    expect(reviewScreen({ keys: [], reading: 1, open: null })).toEqual({
      kind: 'single',
      key: null,
    });
  });

  it('opens a piece from the list as "piece k of n", and falls back when it is removed', () => {
    expect(reviewScreen({ keys: ['a', 'b', 'c'], reading: 0, open: 'b' })).toEqual({
      kind: 'piece',
      key: 'b',
      at: 2,
      of: 3,
    });
    expect(reviewScreen({ keys: ['a', 'c'], reading: 0, open: 'b' })).toEqual({
      kind: 'list',
      count: 2,
    });
  });

  it('files every group once: kept pieces with her edits, removed ones skipped', () => {
    const entries = [
      { key: 'j1:0', group: 'j1', index: 0 },
      { key: 'j1:1', group: 'j1', index: 1 },
      { key: 'j2:0', group: 'j2', index: 0 },
      { key: 'j3:0', group: 'j3', index: 0 },
    ];
    expect(bulkGroups(entries, new Set(['j1:1', 'j3:0']), { 'j2:0': { brand: 'Arket' } })).toEqual([
      {
        group: 'j1',
        answers: [
          { index: 0, state: 'add' },
          { index: 1, state: 'skip' },
        ],
      },
      { group: 'j2', answers: [{ index: 0, state: 'add', edits: { brand: 'Arket' } }] },
      // Nothing kept from this photograph: it still files, so its crops are let go.
      { group: 'j3', answers: [{ index: 0, state: 'skip' }] },
    ]);
  });
});
