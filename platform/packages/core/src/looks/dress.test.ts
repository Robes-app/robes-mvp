import { describe, expect, it } from 'vitest';
import { type DressableLook, dressOnOpen, pictureLanding } from './dress';

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

describe('pictureLanding', () => {
  const ready = { status: 'ready' as const };
  const pending = { status: 'pending' as const };
  it('holds while a job draws, and after it while the picture waits for its renditions', () => {
    expect(pictureLanding(undefined)).toBe(false);
    expect(pictureLanding({ onModel: 'pending', model: null })).toBe(true);
    expect(pictureLanding({ framePending: true })).toBe(true);
    // The job says ready; the picture's renditions are still being made (AWS, from the S3 event).
    expect(pictureLanding({ onModel: 'ready', model: pending, image: pending })).toBe(true);
    expect(pictureLanding({ onModel: null, photo: pending })).toBe(true);
    expect(pictureLanding({ onModel: 'ready', model: ready, image: ready, photo: null })).toBe(
      false,
    );
    expect(pictureLanding({ onModel: 'failed', model: null })).toBe(false);
  });
});
