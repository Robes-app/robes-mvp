import type { Piece, PiecePage } from '@robes/contracts';
import { describe, expect, it } from 'vitest';
import { anyReading, withoutPiece } from './wardrobe';

const piece = (id: string, status: Piece['status'] = 'ready') => ({ id, status }) as Piece;
const page = (...items: Piece[]): PiecePage => ({ items, nextCursor: null });

describe('withoutPiece', () => {
  it('drops the piece from infinite and plain lists and leaves others alone', () => {
    const infinite = {
      pages: [page(piece('a'), piece('b')), page(piece('c'))],
      pageParams: [null, 'x'],
    };
    expect(withoutPiece('b')(infinite)).toEqual({
      pages: [page(piece('a')), page(piece('c'))],
      pageParams: [null, 'x'],
    });
    expect(withoutPiece('a')(page(piece('a'), piece('b')))).toEqual(page(piece('b')));
    expect(withoutPiece('a')(undefined)).toBeUndefined();
  });
});

describe('anyReading', () => {
  it('is true while any piece is still being read', () => {
    expect(anyReading([page(piece('a')), page(piece('b', 'reading'))])).toBe(true);
    expect(anyReading([page(piece('a', 'failed'))])).toBe(false);
    expect(anyReading(undefined)).toBe(false);
  });
});
