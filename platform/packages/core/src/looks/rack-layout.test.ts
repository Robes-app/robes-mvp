import { describe, expect, it } from 'vitest';
import { rackLayoutFor } from './rack-layout';

const photo = { status: 'ready' } as const;
const failed = { status: 'failed' } as const;
const pending = { status: 'pending' } as const;

describe('rackLayoutFor', () => {
  it('opens a look she built on the list, photographs or not', () => {
    expect(rackLayoutFor(false, [photo, photo, photo])).toBe('list');
  });

  it('opens a look Robes made on the tiles when its pieces have photographs', () => {
    expect(rackLayoutFor(true, [photo, photo, photo, photo, photo])).toBe('grid');
  });

  it('keeps the tiles with two in five missing', () => {
    expect(rackLayoutFor(true, [photo, photo, photo, null, undefined])).toBe('grid');
  });

  it('opens on the list once more than two in five have no photograph', () => {
    expect(rackLayoutFor(true, [photo, photo, null, null, null])).toBe('list');
    expect(rackLayoutFor(true, [null, null, null, null])).toBe('list');
    expect(rackLayoutFor(true, [photo, null])).toBe('list');
  });

  it('counts a failed photograph as none, and one still being made as on its way', () => {
    expect(rackLayoutFor(true, [failed, failed, failed, photo, photo])).toBe('list');
    expect(rackLayoutFor(true, [pending, pending, pending, photo, photo])).toBe('grid');
  });

  it('has nothing to tile before the first piece', () => {
    expect(rackLayoutFor(true, [])).toBe('list');
  });
});
