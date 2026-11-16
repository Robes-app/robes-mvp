import { describe, expect, it } from 'vitest';
import { lookChecks } from './checks';
import type { ClosetPiece, StoredPiece } from './v3';

const closet: ClosetPiece[] = [
  {
    id: 'p1',
    label: 'Ivory silk shirt',
    category: 'Tops',
    color: 'ivory',
    brand: null,
    timesWorn: 0,
  },
  {
    id: 'p2',
    label: 'Black wool trousers',
    category: 'Bottoms',
    color: 'black',
    brand: null,
    timesWorn: 2,
  },
  {
    id: 'p3',
    label: 'Tan leather loafers',
    category: 'Shoes',
    color: 'tan',
    brand: null,
    timesWorn: 1,
  },
];

const piece = (
  name: string,
  category: StoredPiece['category'],
  pieceId: string | null,
): StoredPiece => ({
  name,
  category,
  color: '',
  colorHex: null,
  role: null,
  brand: '',
  retailerHint: '',
  pricePoint: '',
  pieceId,
});

describe('lookChecks', () => {
  it('passes a complete look made of her own pieces', () => {
    const look = [
      piece('Ivory silk shirt', 'Tops', 'p1'),
      piece('Black wool trousers', 'Bottoms', 'p2'),
      piece('Tan leather loafers', 'Shoes', 'p3'),
    ];
    expect(lookChecks(look, closet, 'owned')).toEqual({
      complete: true,
      sources_obeyed: true,
      label_mismatch: 0,
      owned: 3,
      proposed: 0,
    });
  });

  it('counts a dress with shoes as complete, and a look without shoes as not', () => {
    expect(
      lookChecks(
        [piece('Slip dress', 'Dresses', null), piece('Sandals', 'Shoes', null)],
        closet,
        'new',
      ).complete,
    ).toBe(true);
    expect(
      lookChecks(
        [piece('Ivory silk shirt', 'Tops', 'p1'), piece('Black wool trousers', 'Bottoms', 'p2')],
        closet,
        'owned',
      ).complete,
    ).toBe(false);
  });

  it('flags a new piece on a wardrobe-only look, and allows it on a mix', () => {
    const look = [piece('Ivory silk shirt', 'Tops', 'p1'), piece('Camel coat', 'Outerwear', null)];
    expect(lookChecks(look, closet, 'owned').sources_obeyed).toBe(false);
    expect(lookChecks(look, closet, 'mix').sources_obeyed).toBe(true);
    expect(lookChecks(look, closet, null).proposed).toBe(1);
  });

  it('counts an owned piece named as something else', () => {
    const look = [
      piece('Grey cashmere knit', 'Tops', 'p1'),
      piece('Wool trousers', 'Bottoms', 'p2'),
    ];
    expect(lookChecks(look, closet, 'owned').label_mismatch).toBe(1);
  });
});
