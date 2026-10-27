import { describe, expect, it } from 'vitest';
import {
  fileEdits,
  isDestination,
  nextPending,
  type ReviewEntry,
  readDraft,
  readyGroups,
  reviewTally,
  rowChanges,
  SCAN_READY_STEP,
  SCAN_STEPS,
  scanCover,
  scanFrame,
  scanTags,
  TAG_SPOTS,
  wishChanges,
} from '.';

const entry = (
  group: string,
  index: number,
  answer: ReviewEntry<{ label: string }>['answer'] = 'pending',
  edits?: { label: string },
): ReviewEntry<{ label: string }> => ({
  key: `${group}:${index}`,
  group,
  index,
  answer,
  ...(edits ? { edits } : {}),
});

describe('add flow', () => {
  it('knows the two destinations', () => {
    expect(isDestination('wardrobe')).toBe(true);
    expect(isDestination('wishlist')).toBe(true);
    expect(isDestination('mine')).toBe(false);
  });

  it('sweeps the line over five steps, then reveals the rows', () => {
    expect(scanFrame(0)).toEqual({ lineTop: 0, lineVisible: true, tagsShown: 0, ready: false });
    expect(scanFrame(3).lineTop).toBe(60);
    expect(scanFrame(5)).toMatchObject({ lineTop: 100, lineVisible: true, ready: false });
    expect(scanFrame(SCAN_READY_STEP)).toMatchObject({ lineVisible: false, ready: true });
    expect(scanFrame(SCAN_STEPS + 4).tagsShown).toBe(SCAN_STEPS);
    expect(scanFrame(-2).tagsShown).toBe(0);
  });

  it('tags each fact once, never more than there are spots', () => {
    expect(scanTags(['Outerwear', 'Coat', null, '', 'camel', 'Camel', 'Wool overcoat'])).toEqual([
      'Outerwear',
      'Coat',
      'camel',
      'Wool overcoat',
    ]);
    expect(scanTags(['a', 'b', 'c', 'd', 'e', 'f']).length).toBe(TAG_SPOTS.length);
  });

  it("drafts Review's rows from Robes' read, the colour word as a shade", () => {
    const draft = readDraft({
      label: 'Wool overcoat',
      brand: null,
      notes: null,
      categoryL2: null,
      categoryL3: null,
      color: 'Navy',
    });
    expect(draft).toMatchObject({
      label: 'Wool overcoat',
      colourShade: 'navy',
      seasonBand: null,
      wearFor: [],
      price: null,
    });
    expect(readDraft({ ...draft, color: null }).colourShade).toBeNull();
  });

  it('walks to the next piece waiting, then wraps, then stops', () => {
    const q = [entry('a', 0, 'add'), entry('a', 1), entry('b', 0, 'skip'), entry('b', 1)];
    expect(nextPending(q, 0)).toBe(1);
    expect(nextPending(q, 1)).toBe(3);
    expect(nextPending(q, 3)).toBe(1);
    expect(nextPending([entry('a', 0, 'add')], 0)).toBeNull();
    // The piece she is on is never its own next one.
    expect(nextPending([entry('a', 0)], 0)).toBeNull();
    expect(nextPending([entry('a', 0)], -1)).toBe(0);
  });

  it('files a group only once every piece in it is answered, and once', () => {
    const q = [
      entry('a', 0, 'add', { label: 'Coat' }),
      entry('a', 1, 'skip'),
      entry('b', 0, 'add'),
      entry('b', 1),
      entry('c', 0, 'skip'),
    ];
    expect(readyGroups(q, new Set())).toEqual([
      {
        group: 'a',
        answers: [
          { index: 0, state: 'add', edits: { label: 'Coat' } },
          { index: 1, state: 'skip' },
        ],
      },
      { group: 'c', answers: [{ index: 0, state: 'skip' }] },
    ]);
    expect(readyGroups(q, new Set(['a', 'c']))).toEqual([]);
    expect(reviewTally(q)).toEqual({ kept: 2, skipped: 2, pending: 1 });
  });
});

describe('Review edits', () => {
  it('keeps only what a drawer can set', () => {
    expect(rowChanges({ hero: true, heroPosition: 2, brand: 'COS', label: undefined })).toEqual({
      brand: 'COS',
    });
  });

  it('files her name, else Robes’, and exactly what she changed', () => {
    expect(fileEdits('Wool overcoat', {})).toEqual({ label: 'Wool overcoat' });
    expect(fileEdits('Wool overcoat', { label: 'Camel coat', material: 'wool' })).toEqual({
      label: 'Camel coat',
      material: 'wool',
    });
  });

  it('reshapes a wish: notes become its note, the wardrobe-only fields stay behind', () => {
    expect(
      wishChanges({ notes: 'Size up', seasonBand: 'year_round', wearFor: ['Work'], size: 'M' }),
    ).toEqual({ note: 'Size up', size: 'M' });
    expect(wishChanges({ brand: 'COS' })).toEqual({ brand: 'COS' });
  });
});

describe('scanCover', () => {
  const covers = (c: ReturnType<typeof scanCover>) => {
    const eps = 1e-9;
    expect(c.left).toBeLessThanOrEqual(eps);
    expect(c.top).toBeLessThanOrEqual(eps);
    expect(c.left + c.width).toBeGreaterThanOrEqual(1 - eps);
    expect(c.top + c.height).toBeGreaterThanOrEqual(1 - eps);
  };

  it('fills the 4:5 frame with the piece, whatever the photo’s shape', () => {
    const box = { x: 0.3, y: 0.2, w: 0.3, h: 0.4 };
    covers(scanCover({ width: 1200, height: 1600, box }));
    covers(scanCover({ width: 1600, height: 900, box }));
    covers(scanCover({ width: 800, height: 3000, box }));
  });

  it('centres the piece in the frame', () => {
    const c = scanCover({ width: 1000, height: 1000, box: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } });
    // The box's centre (0.5, 0.5) lands on the frame's centre.
    expect(c.left + 0.5 * c.width).toBeCloseTo(0.5);
    expect(c.top + 0.5 * c.height).toBeCloseTo(0.5);
  });

  it('never divides by a zero-wide photo', () => {
    const c = scanCover({ width: 0, height: 0, box: { x: 0, y: 0, w: 1, h: 1 } });
    expect(Number.isFinite(c.width) && Number.isFinite(c.height)).toBe(true);
  });
});
