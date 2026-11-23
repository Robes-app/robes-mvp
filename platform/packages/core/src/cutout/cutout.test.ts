import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_BUDGET_MICROS, dailyBudgetMicros } from '../budget';
import type { PieceBox } from '../photo-pieces';
import { asCutPlan, assignLift, CUTOUT_ROUTE_SPECS, cutoutCall, type LabelMap } from './index';

// A lift drawn by hand, 20 pixels a side: '.' is nothing lifted, a digit is that lifted item.
function lift(rows: string[]): LabelMap {
  const width = (rows[0] as string).length;
  const labels = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => {
    expect(row.length).toBe(width);
    [...row].forEach((ch, x) => {
      labels[y * width + x] = ch === '.' ? 0 : Number(ch);
    });
  });
  return { width, height: rows.length, labels };
}

// A box in pixels of the 20-wide fixture, as the read's fractions.
const box = (x: number, y: number, w: number, h: number): PieceBox => ({
  x: x / 20,
  y: y / 20,
  w: w / 20,
  h: h / 20,
});

function ownerRows(map: LabelMap, owner: Uint8Array): string[] {
  const rows: string[] = [];
  for (let y = 0; y < map.height; y++) {
    let row = '';
    for (let x = 0; x < map.width; x++) row += owner[y * map.width + x] || '.';
    rows.push(row);
  }
  return rows;
}

describe('assignLift', () => {
  it('keeps one clean piece whole: straps, and the gap between them', () => {
    const map = lift([
      '....................',
      '....................',
      '......1....1........',
      '......1....1........',
      '......1....1........',
      '.....11111111.......',
      '.....11111111.......',
      '.....11111111.......',
      '.....11111111.......',
      '.....11111111.......',
      '.....11111111.......',
      '.....11111111.......',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ]);
    const { owner, verdicts } = assignLift(map, [box(5, 2, 8, 10)]);
    expect(verdicts[0]).toMatchObject({
      cut: true,
      shared: false,
      pixels: 62,
      bounds: { left: 5, top: 2, width: 8, height: 10 },
    });
    // The pixels kept are the lifted ones, the gap between the straps still a gap.
    expect(ownerRows(map, owner)).toEqual(ownerRows(map, map.labels));
  });

  it('splits two touching pieces lifted as one, each to its own box', () => {
    // A top over a skirt, laid touching: one lifted item, two boxes.
    const map = lift([
      '....................',
      '....................',
      '.....1111111111.....',
      '.....1111111111.....',
      '.....1111111111.....',
      '.....1111111111.....',
      '.....1111111111.....',
      '.....1111111111.....',
      '......11111111......',
      '......11111111......',
      '.....1111111111.....',
      '....111111111111....',
      '....111111111111....',
      '....111111111111....',
      '....111111111111....',
      '....111111111111....',
      '....111111111111....',
      '....................',
      '....................',
      '....................',
    ]);
    const top = box(5, 2, 10, 7);
    const skirt = box(4, 9, 12, 8);
    const { owner, verdicts } = assignLift(map, [top, skirt]);
    expect(verdicts[0]).toMatchObject({ cut: true, shared: true });
    expect(verdicts[1]).toMatchObject({ cut: true, shared: true });
    const rows = ownerRows(map, owner);
    // Above the join every pixel is the top's, below it the skirt's; none is dropped.
    expect(rows[3]).toBe('.....1111111111.....');
    expect(rows[14]).toBe('....222222222222....');
    expect(rows.join('').replace(/\./g, '').length).toBe(
      map.labels.reduce((n, v) => n + (v ? 1 : 0), 0),
    );
    const topPixels = verdicts[0]?.cut ? verdicts[0].pixels : 0;
    const skirtPixels = verdicts[1]?.cut ? verdicts[1].pixels : 0;
    expect(topPixels).toBeGreaterThan(60);
    expect(skirtPixels).toBeGreaterThan(80);
  });

  it('clips away a scrap of the neighbour caught in the lift', () => {
    // A bodysuit (item 1) whose lift carries a scrap of the piece beside it, which lifted as its
    // own item (2).
    const map = lift([
      '....................',
      '..111111............',
      '..111111............',
      '..111111............',
      '..111111............',
      '..111111............',
      '..111111....22222...',
      '..111111....22222...',
      '..11111111..22222...',
      '..11111111..22222...',
      '..111111....22222...',
      '..111111....22222...',
      '..111111............',
      '..111111............',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ]);
    const { owner, verdicts } = assignLift(map, [box(2, 1, 6, 13), box(12, 6, 5, 6)]);
    expect(verdicts[0]).toMatchObject({ cut: true, shared: false });
    expect(verdicts[1]).toMatchObject({ cut: true, shared: false });
    const rows = ownerRows(map, owner);
    // The scrap reached two pixels past the box: one is inside the box's padding, one is cut.
    expect(rows[8]).toBe('..1111111...22222...');
    expect(rows[1]).toBe('..111111............');
  });

  it('keeps the rectangle when the lift misses the box', () => {
    const map = lift([
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '............1111111.',
      '............1111111.',
      '............1111111.',
      '............1111111.',
      '............1111111.',
      '............1111111.',
      '....................',
      '....................',
    ]);
    const { owner, verdicts } = assignLift(map, [box(1, 1, 8, 8)]);
    expect(verdicts[0]).toEqual({ cut: false, reason: 'miss' });
    expect(owner.some((v) => v !== 0)).toBe(false);
  });

  it('keeps the rectangle when the lifted item is mostly outside its box', () => {
    // The whole figure lifted as one item; the box is the shirt alone.
    const rows = Array.from({ length: 20 }, (_, y) =>
      y >= 1 && y <= 18 ? '......11111111......' : '....................',
    );
    const { owner, verdicts } = assignLift(lift(rows), [box(6, 4, 8, 5)]);
    expect(verdicts[0]).toEqual({ cut: false, reason: 'outside' });
    expect(owner.some((v) => v !== 0)).toBe(false);
  });

  it('keeps the rectangle rather than cut a sleeve the box left out', () => {
    // The box runs tight: a third of the piece lies beyond its padding.
    const rows = Array.from({ length: 20 }, (_, y) =>
      y >= 4 && y <= 13 ? '..1111111111111111..' : '....................',
    );
    const { verdicts } = assignLift(lift(rows), [box(2, 4, 10, 10)]);
    expect(verdicts[0]).toEqual({ cut: false, reason: 'outside' });
    // Up to a quarter outside is clipped away and the piece still cut (Annie, 22 Nov).
    const looser = assignLift(lift(rows), [box(2, 4, 12, 10)]);
    expect(looser.verdicts[0]).toMatchObject({ cut: true });
  });

  it('keeps every rectangle when the boxes do not account for a shared item', () => {
    // A person lifted as one item; boxes for the top and the shoes only.
    const rows = Array.from({ length: 20 }, () => '.......111111.......');
    const { owner, verdicts } = assignLift(lift(rows), [box(7, 3, 6, 5), box(7, 17, 6, 3)]);
    expect(verdicts).toEqual([
      { cut: false, reason: 'split' },
      { cut: false, reason: 'split' },
    ]);
    expect(owner.some((v) => v !== 0)).toBe(false);
  });

  it('keeps the rectangle when the mask fills its box', () => {
    const rows = Array.from({ length: 20 }, () => '11111111111111111111');
    const { verdicts } = assignLift(lift(rows), [{ x: 0, y: 0, w: 1, h: 1 }]);
    expect(verdicts[0]).toEqual({ cut: false, reason: 'full' });
  });

  it('takes both shoes of a pair into one box', () => {
    const map = lift([
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '...1111.....2222....',
      '...1111.....2222....',
      '...1111.....2222....',
      '...1111.....2222....',
      '...11.......2222....',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ]);
    const { owner, verdicts } = assignLift(map, [box(3, 6, 13, 5)]);
    expect(verdicts[0]).toMatchObject({ cut: true, pixels: 38, shared: false });
    expect(ownerRows(map, owner)[7]).toBe('...1111.....1111....');
  });

  it('one piece failing leaves its neighbour cut out', () => {
    const map = lift([
      '....................',
      '.1111111............',
      '.1111111............',
      '.1111111............',
      '.1111111............',
      '.1111111............',
      '.1111111............',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
    ]);
    const { verdicts } = assignLift(map, [box(1, 1, 7, 6), box(11, 11, 7, 7)]);
    expect(verdicts[0]).toMatchObject({ cut: true });
    expect(verdicts[1]).toEqual({ cut: false, reason: 'miss' });
  });

  it('refuses a map that is not the size it says', () => {
    const { verdicts } = assignLift({ width: 4, height: 4, labels: new Uint8Array(3) }, [
      box(0, 0, 20, 20),
    ]);
    expect(verdicts).toEqual([{ cut: false, reason: 'miss' }]);
  });
});

describe('asCutPlan', () => {
  const boxes = [{ x: 0.1, y: 0.1, w: 0.4, h: 0.4 }];
  it('reads a stored plan back', () => {
    expect(asCutPlan({ route: 'on-device', index: 0, boxes })).toEqual({
      route: 'on-device',
      index: 0,
      boxes,
    });
  });
  it('keeps the read job it came from, when that is an id', () => {
    const jobId = '11111111-1111-4111-8111-111111111111';
    expect(asCutPlan({ route: 'on-device', index: 0, boxes, jobId })?.jobId).toBe(jobId);
    expect(asCutPlan({ route: 'on-device', index: 0, boxes, jobId: 'x' })?.jobId).toBeUndefined();
  });
  it('refuses anything else', () => {
    expect(asCutPlan(null)).toBeNull();
    expect(asCutPlan({ route: 'elsewhere', index: 0, boxes })).toBeNull();
    expect(asCutPlan({ route: 'on-device', index: 1, boxes })).toBeNull();
    expect(
      asCutPlan({ route: 'on-device', index: 0, boxes: [{ x: 2, y: 0, w: 1, h: 1 }] }),
    ).toBeNull();
    expect(asCutPlan({ route: 'on-device', index: 0, boxes: [] })).toBeNull();
  });
});

describe('cutoutCall', () => {
  it("files a stored cutout at its route's price, on-device at nothing", () => {
    expect(
      cutoutCall({ route: 'on-device', status: 'ok', shared: true, latencyMs: 212.4 }),
    ).toEqual({
      feature: 'wardrobe.cutout',
      model: 'apple-vision-foreground-instance-mask',
      family: 'cutout-on-device',
      tokensIn: 0,
      tokensOut: 0,
      images: 1,
      latencyMs: 212,
      status: 'ok',
      costMicros: 0,
      detail: { route: 'on-device', shared: true },
    });
  });
  it('files a kept rectangle as partial with why, and charges nothing', () => {
    expect(
      cutoutCall({ route: 'on-device', status: 'fallback', reason: 'outside', latencyMs: 80 }),
    ).toMatchObject({
      status: 'partial',
      costMicros: 0,
      detail: { route: 'on-device', reason: 'outside' },
    });
  });
  it('every route has its own daily budget line', () => {
    for (const spec of Object.values(CUTOUT_ROUTE_SPECS)) {
      expect(dailyBudgetMicros(spec.family)).not.toBe(DEFAULT_DAILY_BUDGET_MICROS);
    }
  });
});
