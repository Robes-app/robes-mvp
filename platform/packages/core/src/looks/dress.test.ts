import { describe, expect, it } from 'vitest';
import { modelPill, type PillLook, pictureLanding } from './dress';

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

describe('modelPill', () => {
  const drawn = (over: Partial<PillLook> = {}): PillLook => ({
    frame: false,
    model: { assetId: 'a' },
    onModel: 'ready',
    framePending: false,
    robesHidden: false,
    record: 'model',
    photo: null,
    ...over,
  });
  const bare = (over: Partial<PillLook> = {}) => drawn({ model: null, onModel: null, ...over });
  const rest = { rows: 2, stale: false, drawing: false };

  it('offers the first picture to a look with pieces and none of her model yet', () => {
    expect(modelPill(bare(), rest)).toBe('dress');
    expect(modelPill(bare(), { ...rest, stale: true })).toBe('dress');
    // A look from her photograph, its pieces found.
    expect(modelPill(bare({ record: 'photo', photo: {} }), rest)).toBe('dress');
    expect(modelPill(bare(), { ...rest, rows: 0 })).toBeNull();
  });

  it('offers an update only once the pieces differ from the picture', () => {
    expect(modelPill(drawn(), rest)).toBeNull();
    expect(modelPill(drawn(), { ...rest, stale: true })).toBe('update');
    expect(modelPill(drawn({ frame: true }), { ...rest, stale: true })).toBe('update');
    expect(modelPill(drawn({ frame: true, model: null }), rest)).toBeNull();
  });

  it('stands down while the picture is drawn', () => {
    expect(modelPill(drawn(), { ...rest, stale: true, drawing: true })).toBeNull();
    expect(modelPill(drawn({ onModel: 'pending' }), { ...rest, stale: true })).toBeNull();
    expect(modelPill(drawn({ framePending: true }), { ...rest, stale: true })).toBeNull();
    expect(modelPill(bare({ onModel: 'pending' }), rest)).toBeNull();
  });

  it('leaves a failed picture to its Try again, unless her photograph covers it', () => {
    expect(modelPill(bare({ onModel: 'failed' }), rest)).toBeNull();
    expect(modelPill(bare({ onModel: 'failed', record: 'photo', photo: {} }), rest)).toBe('dress');
  });

  it('never offers afresh a picture she hid, until its pieces change', () => {
    expect(modelPill(bare({ robesHidden: true }), rest)).toBeNull();
    expect(modelPill(bare({ robesHidden: true }), { ...rest, stale: true })).toBe('dress');
  });
});
