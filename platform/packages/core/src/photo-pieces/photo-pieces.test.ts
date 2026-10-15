import { describe, expect, it } from 'vitest';
import {
  collapsePairs,
  countWord,
  cropPixels,
  cropRegion,
  normaliseBox,
  nudgeTags,
  pieceWord,
} from './index';

describe('photo pieces', () => {
  it('clamps boxes into the frame and reads an unplaceable box as the whole photo', () => {
    expect(normaliseBox({ x: 0.5, y: 0.6, w: 0.8, h: 0.2 })).toEqual({
      x: 0.5,
      y: 0.6,
      w: 0.5,
      h: 0.2,
    });
    expect(normaliseBox({ x: -1, y: 0.2, w: 0.3, h: 2 })).toEqual({ x: 0, y: 0.2, w: 0.3, h: 0.8 });
    expect(normaliseBox({ x: 0.4, y: 0.4, w: 0.01, h: 0.5 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(normaliseBox(null)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('pads the crop by 8% and never cuts under 28% of the frame', () => {
    const r = cropRegion({ x: 0.4, y: 0.1, w: 0.4, h: 0.5 });
    expect(r.x).toBeCloseTo(0.32);
    expect(r.w).toBeCloseTo(0.56);
    expect(r.h).toBeCloseTo(0.66);
    const small = cropRegion({ x: 0.5, y: 0.5, w: 0.04, h: 0.04 });
    expect(small.w).toBeCloseTo(0.28);
    expect(small.h).toBeCloseTo(0.28);
    expect(small.x + small.w / 2).toBeCloseTo(0.52);
    expect(cropPixels({ x: 0.9, y: 0.9, w: 0.1, h: 0.1 }, 1000, 800)).toEqual({
      left: 810,
      top: 648,
      width: 190,
      height: 152,
    });
  });

  it('folds the second shoe of a pair into the first, keeping a match on either', () => {
    const match = { pieceId: '00000000-0000-4000-8000-000000000001', confidence: 0.7 };
    const out = collapsePairs([
      {
        label: 'Gold heeled sandals',
        category: 'Shoes',
        box: { x: 0.1, y: 0.8, w: 0.1, h: 0.1 },
        match: null,
      },
      { label: 'Linen dress', category: 'Dresses', box: { x: 0, y: 0, w: 1, h: 0.8 }, match: null },
      {
        label: 'Silver heeled sandals',
        category: 'Shoes',
        box: { x: 0.3, y: 0.85, w: 0.1, h: 0.1 },
        match,
      },
      {
        label: 'Leather loafers',
        category: 'Shoes',
        box: { x: 0, y: 0, w: 0.1, h: 0.1 },
        match: null,
      },
    ]);
    expect(out.map((p) => p.label)).toEqual([
      'Gold heeled sandals',
      'Linen dress',
      'Leather loafers',
    ]);
    expect(out[0]?.box.x).toBeCloseTo(0.1);
    expect(out[0]?.box.w).toBeCloseTo(0.3);
    expect(out[0]?.box.h).toBeCloseTo(0.15);
    expect(out[0]?.match).toEqual(match);
  });

  it('names a tag by its item type, else the label’s last word', () => {
    expect(pieceWord({ label: 'Cream long-sleeve t-shirt', categoryL3: 'Long-sleeve tee' })).toBe(
      'Long-sleeve tee',
    );
    expect(pieceWord({ label: 'Black leggings', categoryL3: null })).toBe('Leggings');
    expect(countWord(3)).toBe('three');
    expect(countWord(12)).toBe('12');
  });

  it('nudges tags that share a centre clear of each other, inside the frame', () => {
    const tags = nudgeTags(
      [
        { cx: 100, cy: 100, w: 60, h: 20 },
        { cx: 100, cy: 100, w: 60, h: 20 },
        { cx: 100, cy: 195, w: 60, h: 20 },
      ],
      300,
      200,
    );
    for (const [i, a] of tags.entries()) {
      expect(a.cy - a.h / 2).toBeGreaterThanOrEqual(0);
      expect(a.cy + a.h / 2).toBeLessThanOrEqual(200);
      for (const b of tags.slice(i + 1)) {
        expect(
          Math.abs(a.cy - b.cy) >= (a.h + b.h) / 2 || Math.abs(a.cx - b.cx) >= (a.w + b.w) / 2,
        ).toBe(true);
      }
    }
  });
});

describe('the confirm pattern', () => {
  it('asks "Already yours?" only for a likely duplicate', async () => {
    const { likelyDuplicate, answerCard, wardrobeSummary } = await import('./index');
    const id = '00000000-0000-4000-8000-000000000001';
    expect(likelyDuplicate({ pieceId: id, confidence: 0.5 })).toBe(id);
    expect(likelyDuplicate({ pieceId: id, confidence: 0.49 })).toBeNull();
    expect(likelyDuplicate(null)).toBeNull();
    expect(answerCard(id, 'yes')).toEqual({ state: 'owned', pieceId: id });
    expect(answerCard(id, 'no')).toEqual({ state: 'add' });
    expect(answerCard(null, 'yes')).toEqual({ state: 'add' });
    expect(answerCard(null, 'no')).toEqual({ state: 'skip' });
    expect(
      wardrobeSummary([
        { state: 'add' },
        { state: 'owned', pieceId: id },
        { state: 'pending' },
        { state: 'skip' },
        { state: 'add' },
      ]),
    ).toEqual({ pending: 1, toAdd: 2, owned: 1, skipped: 1 });
  });
});
