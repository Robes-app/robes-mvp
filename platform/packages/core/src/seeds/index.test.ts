import { describe, expect, it } from 'vitest';
import { priceFromPoint } from '../looks';
import { seedPricePoint, seedStates, seedUrl, waitingSeed } from '.';

const XMAS = { seedId: 'xmas-2026', liveFrom: '2026-11-23', liveUntil: '2027-01-06' };
const SPRING = { seedId: 'spring-2027', liveFrom: '2027-01-06', liveUntil: '2027-03-31' };

describe('seedStates', () => {
  it('is live from the first day to the last, inclusive', () => {
    expect(seedStates([XMAS], '2026-11-22')).toEqual({ live: [], ended: [] });
    expect(seedStates([XMAS], '2026-11-23')).toEqual({ live: ['xmas-2026'], ended: [] });
    expect(seedStates([XMAS], '2027-01-06')).toEqual({ live: ['xmas-2026'], ended: [] });
    expect(seedStates([XMAS], '2027-01-07')).toEqual({ live: [], ended: ['xmas-2026'] });
  });

  it('hands one drop over to the next on the same day', () => {
    expect(seedStates([XMAS, SPRING], '2027-01-06').live).toEqual(['xmas-2026', 'spring-2027']);
    expect(seedStates([XMAS, SPRING], '2027-01-07')).toEqual({
      live: ['spring-2027'],
      ended: ['xmas-2026'],
    });
  });
});

describe('seedPricePoint', () => {
  it('prints the price in her currency, never a converted one', () => {
    expect(seedPricePoint({ GBP: 48 }, 'GBP')).toBe('£48');
    expect(seedPricePoint({ EUR: 62 }, 'EUR')).toBe('€62');
    expect(seedPricePoint({ GBP: 22.5 }, 'GBP')).toBe('£23');
    expect(seedPricePoint({ GBP: 48 }, 'EUR')).toBe('');
    expect(seedPricePoint({ GBP: 48 }, 'USD')).toBe('');
  });

  it('reads back as the price Save files to her wishlist', () => {
    expect(priceFromPoint(seedPricePoint({ GBP: 140 }, 'GBP'))).toEqual({
      price: 140,
      currency: 'GBP',
    });
  });
});

describe('waitingSeed', () => {
  it('names the drop whose looks still wait, else none', () => {
    expect(waitingSeed([{ seedId: null }, { seedId: 'xmas-2026' }])).toBe('xmas-2026');
    expect(waitingSeed([{ seedId: null }, {}])).toBeNull();
    expect(waitingSeed([])).toBeNull();
  });
});

describe('seedUrl', () => {
  const both = { uk: 'https://shop.co.uk/p', ie: 'https://shop.ie/p' };
  it('links her own market, else the other, else none', () => {
    expect(seedUrl(both, 'GBP')).toBe(both.uk);
    expect(seedUrl(both, 'EUR')).toBe(both.ie);
    expect(seedUrl({ uk: null, ie: both.ie }, 'GBP')).toBe(both.ie);
    expect(seedUrl({ uk: both.uk, ie: null }, 'EUR')).toBe(both.uk);
    expect(seedUrl({ uk: null, ie: null }, 'EUR')).toBeNull();
  });
});
