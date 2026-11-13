import { describe, expect, it } from 'vitest';
import { type DressableLook, dressOnOpen } from './dress';

const look = (over: Partial<DressableLook> = {}): DressableLook => ({
  status: 'saved',
  frame: false,
  pieces: [{}],
  model: { assetId: 'a' },
  onModel: 'ready',
  modelStale: false,
  robesHidden: false,
  ...over,
});

describe('dressOnOpen', () => {
  it('dresses a saved look with no picture of her model yet', () => {
    expect(dressOnOpen(look({ model: null, onModel: null }))).toBe(true);
  });

  it('draws again a picture that stands on a model she no longer stands on', () => {
    expect(dressOnOpen(look({ modelStale: true }))).toBe(true);
    expect(dressOnOpen(look())).toBe(false);
  });

  it('leaves a picture she hid, one drawing, and Robes’ frame as they are', () => {
    expect(dressOnOpen(look({ modelStale: true, robesHidden: true }))).toBe(false);
    expect(dressOnOpen(look({ modelStale: true, onModel: 'pending' }))).toBe(false);
    expect(dressOnOpen(look({ model: null, frame: true }))).toBe(false);
  });

  it('dresses only a saved look with pieces', () => {
    expect(dressOnOpen(look({ model: null, status: 'draft' }))).toBe(false);
    expect(dressOnOpen(look({ model: null, pieces: [] }))).toBe(false);
  });
});
