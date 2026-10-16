import type { Piece, PiecePage } from '@robes/contracts';
import { describe, expect, it } from 'vitest';
import { anyReading, withoutId } from './wardrobe';

const piece = (id: string, status: Piece['status'] = 'ready') => ({ id, status }) as Piece;
const page = (...items: Piece[]): PiecePage => ({ items, nextCursor: null, total: items.length });
const ofTotal = (total: number, ...items: Piece[]): PiecePage => ({
  items,
  nextCursor: null,
  total,
});

describe('withoutId', () => {
  it('drops the piece from infinite and plain lists and leaves others alone', () => {
    // Every page carries the query's total; the count row drops by one at once.
    const infinite = {
      pages: [ofTotal(3, piece('a'), piece('b')), ofTotal(3, piece('c'))],
      pageParams: [null, 'x'],
    };
    expect(withoutId('b')(infinite)).toEqual({
      pages: [ofTotal(2, piece('a')), ofTotal(2, piece('c'))],
      pageParams: [null, 'x'],
    });
    expect(withoutId('z')(infinite)).toEqual(infinite);
    expect(withoutId('a')(page(piece('a'), piece('b')))).toEqual(page(piece('b')));
    expect(withoutId('a')(undefined)).toBeUndefined();
  });
});

describe('anyReading', () => {
  it('is true while any piece is still being read', () => {
    expect(anyReading([page(piece('a')), page(piece('b', 'reading'))])).toBe(true);
    expect(anyReading([page(piece('a', 'failed'))])).toBe(false);
    expect(anyReading(undefined)).toBe(false);
  });
});

describe('withPatch', () => {
  it('edits the one piece in every page', async () => {
    const { withPatch } = await import('./wardrobe');
    const infinite = { pages: [page(piece('a'), piece('b'))], pageParams: [null] };
    const next = withPatch('b', { heroPosition: 1 })(infinite) as typeof infinite;
    expect(next.pages[0]?.items.map((p) => p.heroPosition)).toEqual([undefined, 1]);
  });
});
