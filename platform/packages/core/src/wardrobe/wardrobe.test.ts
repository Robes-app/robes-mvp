import { describe, expect, it } from 'vitest';
import {
  countByCategory,
  defaultLayout,
  nameWithoutBrand,
  pieceEyebrow,
  rankCategories,
} from './index';

describe('the piece card', () => {
  it('opens on the list on a phone and the grid on the web', () => {
    expect(defaultLayout(true)).toBe('list');
    expect(defaultLayout(false)).toBe('grid');
  });

  it('reads Category · Brand, the sheet category when the type is known', () => {
    expect(
      pieceEyebrow({ category: 'Tops', categoryL2: 'Shirts & blouses', brand: 'COS' }),
    ).toEqual({ category: 'Tops', brand: 'COS' });
    expect(pieceEyebrow({ category: 'Outerwear', categoryL2: null, brand: '  ' })).toEqual({
      category: 'Outerwear',
      brand: null,
    });
  });

  it('keeps the brand out of the name', () => {
    expect(nameWithoutBrand('COS Wool coat', 'COS')).toBe('Wool coat');
    expect(nameWithoutBrand('Wool coat', 'COS')).toBe('Wool coat');
    expect(nameWithoutBrand('COS', 'COS')).toBe('COS');
    expect(nameWithoutBrand('Cosy jumper', null)).toBe('Cosy jumper');
  });

  it('ranks the category tabs by pieces, ties in the canonical order', () => {
    expect(
      rankCategories([
        { category: 'Shoes', count: 2 },
        { category: 'Tops', count: 2 },
        { category: 'Bottoms', count: 5 },
        { category: 'Bags', count: 0 },
        { category: 'Nonsense', count: 9 },
      ]),
    ).toEqual(['Bottoms', 'Tops', 'Shoes']);
    expect(
      countByCategory([{ category: 'Tops' }, { category: 'Tops' }, { category: 'Bags' }]),
    ).toEqual([
      { category: 'Tops', count: 2 },
      { category: 'Bags', count: 1 },
    ]);
  });
});

describe('formatPrice', () => {
  it('prints a wish’s price, and nothing without one', async () => {
    const { formatPrice } = await import('./index');
    expect(formatPrice(27.95, 'EUR')).toBe('€27.95');
    expect(formatPrice(40, 'GBP')).toBe('£40');
    expect(formatPrice(null, 'EUR')).toBeNull();
    expect(formatPrice(0, 'EUR')).toBeNull();
  });
});
