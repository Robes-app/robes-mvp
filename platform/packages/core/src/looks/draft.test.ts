import { describe, expect, it } from 'vitest';
import {
  compositionKey,
  filledSlots,
  hotspotFor,
  isHandBuiltDraft,
  pieceMatches,
  placePick,
  sheetCategoryOf,
  sheetChips,
} from './draft';

describe('the draft composer', () => {
  it('puts a piece in its own slot, a dress on the top', () => {
    expect(hotspotFor('Tops')).toBe('top');
    expect(hotspotFor('Dresses')).toBe('top');
    expect(hotspotFor('Bottoms')).toBe('bottom');
    expect(hotspotFor('Shoes')).toBe('shoes');
    expect(hotspotFor('Bags')).toBeNull();
  });

  it('marks the slots the rack fills; a dress fills top and bottom', () => {
    expect([...filledSlots(['Dresses'])].sort()).toEqual(['bottom', 'top']);
    expect([...filledSlots(['Shoes', 'Bags'])]).toEqual(['shoes']);
    expect(filledSlots([]).size).toBe(0);
  });

  it('swaps the row holding the slot a pick lands in, else adds', () => {
    const rows = [
      { key: 'a', category: 'Tops' },
      { key: 'b', category: 'Bags' },
    ];
    // A top picked from + Bottom goes to Top and swaps the top she has.
    expect(placePick(rows, 'Tops', true)).toEqual({ swap: 'a' });
    expect(placePick(rows, 'Bottoms', true)).toEqual({ add: true });
    expect(placePick(rows, 'Accessories', true)).toEqual({ add: true });
    // The rack's own + Add a piece always adds.
    expect(placePick(rows, 'Tops', false)).toEqual({ add: true });
  });

  it('reads the sheet category, falling back to the stored one', () => {
    expect(sheetCategoryOf({ category: 'Tops', categoryL2: 'Jumpers & sweaters' })).toBe(
      'Knitwear',
    );
    expect(sheetCategoryOf({ category: 'Tops', categoryL2: null })).toBe('Tops');
    expect(sheetCategoryOf({ category: 'Shoes', categoryL2: 'Nonsense' })).toBe('Shoes');
  });

  it('leads the chips with Tops, Bottoms and Shoes, then what she has filed', () => {
    expect(sheetChips(['Knitwear', 'Shoes', 'Bags', 'Knitwear'])).toEqual([
      'Tops',
      'Bottoms',
      'Shoes',
      'Knitwear',
      'Bags',
    ]);
    expect(sheetChips([])).toEqual(['Tops', 'Bottoms', 'Shoes']);
  });

  it('searches the whole wardrobe by name, brand, category and colour', () => {
    const p = { label: 'Cream waistcoat', brand: 'Totême', category: 'Tops', color: 'Cream' };
    expect(pieceMatches(p, '')).toBe(true);
    expect(pieceMatches(p, 'toT')).toBe(true);
    expect(pieceMatches(p, 'cream')).toBe(true);
    expect(pieceMatches(p, 'tops')).toBe(true);
    expect(pieceMatches(p, 'jeans')).toBe(false);
  });

  it('keys a composition by its pieces in any order', () => {
    expect(compositionKey(['b', 'a'])).toBe(compositionKey(['a', 'b']));
    expect(compositionKey([])).toBe('');
  });

  it('opens a hand-built draft in the composer, never a suggestion or a photograph', () => {
    const base = { status: 'draft', setId: null, frame: false, image: null, onModel: null };
    expect(isHandBuiltDraft(base)).toBe(true);
    expect(isHandBuiltDraft({ ...base, image: {}, onModel: 'ready' })).toBe(true);
    expect(isHandBuiltDraft({ ...base, image: {} })).toBe(false);
    expect(isHandBuiltDraft({ ...base, setId: 'x' })).toBe(false);
    expect(isHandBuiltDraft({ ...base, frame: true })).toBe(false);
    expect(isHandBuiltDraft({ ...base, status: 'saved' })).toBe(false);
  });
});
