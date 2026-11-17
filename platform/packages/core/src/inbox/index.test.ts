import { describe, expect, it } from 'vitest';
import {
  namesNoPiece,
  photoLanding,
  pieceName,
  receivedDay,
  splitAddress,
  toggleKept,
} from './index';

describe('toggleKept', () => {
  it('unticks a kept piece and ticks it back in order', () => {
    expect(toggleKept([0, 1, 2], 1)).toEqual([0, 2]);
    expect(toggleKept([0, 2], 1)).toEqual([0, 1, 2]);
    expect(toggleKept([], 3)).toEqual([3]);
  });
});

describe('receivedDay', () => {
  const now = new Date(2026, 9, 26, 15, 0);
  it('reads today and yesterday on her own calendar', () => {
    expect(receivedDay(new Date(2026, 9, 26, 0, 5).toISOString(), now)).toEqual({
      kind: 'today',
    });
    expect(receivedDay(new Date(2026, 9, 25, 23, 50).toISOString(), now)).toEqual({
      kind: 'yesterday',
    });
  });

  it('names an older day by its date', () => {
    expect(receivedDay(new Date(2026, 8, 12, 9, 0).toISOString(), now)).toEqual({
      kind: 'date',
      label: '12 Sep',
    });
  });
});

describe('splitAddress', () => {
  it('breaks only at the @', () => {
    expect(splitAddress('k3x9p2m7q1w5e8r4t6y0@in.staging.mail.byrobes.com')).toEqual({
      local: 'k3x9p2m7q1w5e8r4t6y0',
      domain: '@in.staging.mail.byrobes.com',
    });
  });

  it('leaves an address with no @ whole', () => {
    expect(splitAddress('nothing-here')).toEqual({ local: 'nothing-here', domain: '' });
    expect(splitAddress('@lonely')).toEqual({ local: '@lonely', domain: '' });
  });
});

// A receipt line with no name for the piece reads as its brand and category (UX audit, 15 Nov).
describe('pieceName', () => {
  it('keeps a real name word for word', () => {
    expect(pieceName({ label: 'Black flare leggings', brand: 'Zara' })).toBe(
      'Black flare leggings',
    );
    expect(namesNoPiece('Top 2', 'Zara')).toBe(false);
  });
  it('names a reference code by its brand and category', () => {
    expect(
      pieceName({ label: 'REF 09003701051', brand: 'Zara', categoryL2: 'T-shirts & tees' }),
    ).toBe('Zara top');
    expect(
      pieceName({
        label: 'SKU 4471-22',
        brand: 'COS',
        categoryL2: 'Sweatshirts & hoodies',
        categoryL3: 'Hoodie',
      }),
    ).toBe('COS hoodie');
  });
  it('treats the brand alone as no name, and falls back to "piece"', () => {
    expect(pieceName({ label: 'Zara', brand: 'Zara' })).toBe('Zara piece');
    expect(pieceName({ label: '0900 3701 051' })).toBe('Piece');
  });
});

describe('photoLanding', () => {
  const item = (reading: boolean, status: string | null) => ({
    reading,
    image: status ? { status } : null,
  });
  it('asks again while a photo is asked for or rendering, and stops once it lands or fails', () => {
    expect(photoLanding(undefined)).toBe(false);
    expect(photoLanding({ items: [item(true, null)] })).toBe(true);
    expect(photoLanding({ items: [item(false, 'pending')] })).toBe(true);
    expect(photoLanding({ items: [item(false, 'ready')] })).toBe(false);
    expect(photoLanding({ items: [item(false, 'failed')] })).toBe(false);
    expect(photoLanding({ items: [item(false, null)] })).toBe(false);
  });
});
