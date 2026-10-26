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

describe('the Price drawer', () => {
  it('opens on the currency of the device’s region, euro otherwise', async () => {
    const { currencyForLocale, isPriceCurrency } = await import('./index');
    expect(currencyForLocale('en-GB')).toBe('GBP');
    expect(currencyForLocale('en_GB')).toBe('GBP');
    expect(currencyForLocale('en-US')).toBe('USD');
    expect(currencyForLocale('zh-Hant-US')).toBe('USD');
    expect(currencyForLocale('en-IE')).toBe('EUR');
    expect(currencyForLocale('fr')).toBe('EUR');
    expect(currencyForLocale(undefined)).toBe('EUR');
    expect(isPriceCurrency('GBP')).toBe(true);
    expect(isPriceCurrency('JPY')).toBe(false);
    expect(isPriceCurrency(null)).toBe(false);
  });

  it('reads a price as she types it, and nothing that isn’t one', async () => {
    const { parsePriceInput } = await import('./index');
    expect(parsePriceInput('89.99')).toBe(89.99);
    expect(parsePriceInput('89,99')).toBe(89.99);
    expect(parsePriceInput('1,200')).toBe(1200);
    expect(parsePriceInput('1,200.50')).toBe(1200.5);
    expect(parsePriceInput(' € 340 ')).toBe(340);
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('-5')).toBeNull();
    expect(parsePriceInput('ten')).toBeNull();
    expect(parsePriceInput('1.2.3')).toBeNull();
    expect(parsePriceInput('99999999')).toBeNull();
  });
});

describe('suggestPieceName', () => {
  it('offers the colour and the leaf of the category', async () => {
    const { suggestPieceName } = await import('./index');
    expect(
      suggestPieceName({
        colourName: 'Navy',
        categoryL2: 'Jumpers & sweaters',
        categoryL3: 'Crew neck jumper',
      }),
    ).toBe('Navy crew neck jumper');
    expect(suggestPieceName({ categoryL2: 'Coats', categoryL3: null })).toBe('Coats');
    expect(suggestPieceName({ colourName: 'Navy' })).toBeNull();
    expect(suggestPieceName({})).toBeNull();
  });
});
