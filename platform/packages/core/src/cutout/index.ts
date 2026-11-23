import type { PieceBox } from '../photo-pieces';

// A piece cut out of her own photograph (cutout brief, 21 Nov 2026). The phone lifts what stands
// out of the photo (Apple's foreground instance masks) and uploads the result as one "lift"; the
// read's boxes then decide which lifted item is which piece. Everything here is a pure rule over
// that lift and those boxes, shared by the renderer and its tests. A piece that fails a check
// keeps today's rectangle and says nothing.

export const CUTOUT_FEATURE = 'wardrobe.cutout';

// Where a piece's mask came from. One route today; a server route (worn pieces, the web) joins
// here with its own masks and goes through the same rules.
export const CUTOUT_ROUTES = ['on-device'] as const;
export type CutoutRoute = (typeof CUTOUT_ROUTES)[number];

// What each route is filed as in the cost ledger (app.generation_calls) and what a piece costs
// on it. These are not Gemini models, so they live here rather than in @robes/ai's registry; a
// family needs its line in DAILY_BUDGET_MICROS (budget/index.ts).
export const CUTOUT_ROUTE_SPECS: Record<
  CutoutRoute,
  { model: string; family: string; perPieceMicros: number }
> = {
  // Apple's Vision foreground instance masks on her iPhone (iOS 17+): free, nothing leaves it.
  'on-device': {
    model: 'apple-vision-foreground-instance-mask',
    family: 'cutout-on-device',
    perPieceMicros: 0,
  },
};

// One cutout tried, as a ledger row: stored ('ok') or the rectangle kept ('partial', with why).
// A piece is charged only when its cutout is stored.
export function cutoutCall(outcome: {
  route: CutoutRoute;
  status: 'ok' | 'fallback';
  latencyMs: number;
  reason?: string;
  shared?: boolean;
}) {
  const spec = CUTOUT_ROUTE_SPECS[outcome.route];
  const ok = outcome.status === 'ok';
  return {
    feature: CUTOUT_FEATURE,
    model: spec.model,
    family: spec.family,
    tokensIn: 0,
    tokensOut: 0,
    images: 1,
    latencyMs: Math.max(0, Math.round(outcome.latencyMs)),
    status: ok ? ('ok' as const) : ('partial' as const),
    costMicros: ok ? spec.perPieceMicros : 0,
    detail: {
      route: outcome.route,
      ...(ok ? { shared: outcome.shared === true } : { reason: outcome.reason ?? 'error' }),
    },
  };
}

// The lift file: a PNG the size of the upright photo (long edge at most LIFT_MAX_EDGE). Red is
// the lifted item a pixel belongs to, as its number times LIFT_LABEL_STEP (0: nothing lifted);
// green is how much of the pixel is that item (the soft edge). Blue is unused.
export const LIFT_LABEL_STEP = 16;
export const LIFT_MAX_ITEMS = 15;
export const LIFT_MAX_EDGE = 2048;
export const LIFT_MAX_BYTES = 6 * 1024 * 1024;
export const LIFT_CONTENT_TYPE = 'image/png';

// The lift read into numbers: one label per pixel (0: nothing lifted, 1…n: a lifted item).
export interface LabelMap {
  width: number;
  height: number;
  labels: Uint8Array;
}

// Why a piece keeps its rectangle. Codes only: they ride the cost ledger's `detail`.
export type CutoutMiss =
  // Nothing was lifted where the box is, or too little to be the piece.
  | 'miss'
  // The lifted item reaches well outside the box: clipping it would cut the piece (a sleeve), or
  // the item is not the piece at all (the surface it lies on, a whole person).
  | 'outside'
  // One lifted item covers several boxes and they do not account for it between them.
  | 'split'
  // The mask fills its box: a rectangle again, nothing gained.
  | 'full';

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type CutVerdict =
  | { cut: true; pixels: number; bounds: PixelRect; shared: boolean }
  | { cut: false; reason: CutoutMiss };

export interface Assignment {
  // One entry per pixel: 0, or the piece (its index in `boxes`, plus one) that keeps the pixel.
  owner: Uint8Array;
  verdicts: CutVerdict[];
}

// The sanity checks, as shares. Set from Annie's three tests in Photos (21 Nov: a vest lifted
// clean, a top and skirt lifted as one, a bodysuit carrying a scrap of its neighbour) and to be
// tuned on real photographs: every one is a guess until it has met a few hundred pieces.
export const CUTOUT_RULES = {
  // A box is trusted to within this share of its own size on each side (the read's boxes run a
  // little tight); a lifted item is clipped there.
  pad: 0.08,
  // The lifted pixels inside a box, as a share of the box, under which nothing was lifted for it.
  minFill: 0.03,
  // The share of a lifted item that must lie inside its piece's padded box. Under it the clip
  // would cut more than a scrap of a neighbour, so the rectangle stays. A quarter of the item
  // may fall outside to start with (Annie, 22 Nov), to be tightened if sleeves go missing.
  minInside: 0.75,
  // A lifted item shared by several boxes: the share of it those boxes must account for.
  minCovered: 0.85,
  // A second lifted item this far inside a box is part of the piece (the other shoe, a belt).
  extraInside: 0.7,
  // A mask filling this share of its padded box is the box.
  maxFill: 0.97,
} as const;

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

function rectOf(box: PieceBox, width: number, height: number, pad: number): Rect {
  const x0 = Math.max(0, Math.floor((box.x - box.w * pad) * width));
  const y0 = Math.max(0, Math.floor((box.y - box.h * pad) * height));
  const x1 = Math.min(width, Math.ceil((box.x + box.w * (1 + pad)) * width));
  const y1 = Math.min(height, Math.ceil((box.y + box.h * (1 + pad)) * height));
  return {
    x0,
    y0,
    x1,
    y1,
    cx: (box.x + box.w / 2) * width,
    cy: (box.y + box.h / 2) * height,
    hw: Math.max(1, (box.w * width) / 2),
    hh: Math.max(1, (box.h * height) / 2),
  };
}

const inside = (r: Rect, x: number, y: number) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
const area = (r: Rect) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
// How far a pixel is from a box's centre, in half-boxes: under 1 is inside the box.
const reach = (r: Rect, x: number, y: number) =>
  Math.max(Math.abs(x - r.cx) / r.hw, Math.abs(y - r.cy) / r.hh);

// Which piece keeps each lifted pixel, and which pieces keep their rectangle instead.
//
// - A box's item is the lifted item covering most of it. Items lying almost wholly inside the
//   box that no other box claims join it (the second shoe of a pair).
// - An item claimed by one box is clipped to that box, padded: a scrap of a neighbour caught in
//   the lift falls away. If the clip would cut more than a scrap, the piece keeps its rectangle.
// - An item claimed by several boxes (two pieces laid touching lift as one) is split between
//   them: each pixel goes to the box it sits in, and where boxes overlap to the nearer centre.
//   If the boxes do not account for the item, all of them keep their rectangles.
export function assignLift(map: LabelMap, boxes: readonly PieceBox[]): Assignment {
  const { width, height, labels } = map;
  const R = CUTOUT_RULES;
  const n = boxes.length;
  const tight = boxes.map((b) => rectOf(b, width, height, 0));
  const padded = boxes.map((b) => rectOf(b, width, height, R.pad));
  const owner = new Uint8Array(width * height);
  if (labels.length !== width * height || n === 0 || n > 254) {
    return { owner, verdicts: boxes.map(() => ({ cut: false, reason: 'miss' })) };
  }

  const items = LIFT_MAX_ITEMS + 1;
  const total = new Float64Array(items);
  const inTight = Array.from({ length: n }, () => new Float64Array(items));
  const inPadded = Array.from({ length: n }, () => new Float64Array(items));
  for (let y = 0, p = 0; y < height; y++) {
    for (let x = 0; x < width; x++, p++) {
      const k = labels[p] as number;
      if (k === 0 || k >= items) continue;
      total[k] = (total[k] as number) + 1;
      for (let i = 0; i < n; i++) {
        if (!inside(padded[i] as Rect, x, y)) continue;
        (inPadded[i] as Float64Array)[k] = ((inPadded[i] as Float64Array)[k] as number) + 1;
        if (inside(tight[i] as Rect, x, y)) {
          (inTight[i] as Float64Array)[k] = ((inTight[i] as Float64Array)[k] as number) + 1;
        }
      }
    }
  }

  // Each box's item, and each item's boxes.
  const primary = new Array<number>(n).fill(0);
  const claimants: number[][] = Array.from({ length: items }, () => []);
  for (let i = 0; i < n; i++) {
    let best = 0;
    for (let k = 1; k < items; k++) {
      if (((inTight[i] as Float64Array)[k] as number) > ((inTight[i] as Float64Array)[best] ?? 0))
        best = k;
    }
    const filled = best ? ((inTight[i] as Float64Array)[best] as number) : 0;
    if (best && filled >= R.minFill * area(tight[i] as Rect)) {
      primary[i] = best;
      (claimants[best] as number[]).push(i);
    }
  }
  // Unclaimed items that sit inside one box go with it.
  const extraOf = new Array<number>(items).fill(-1);
  for (let k = 1; k < items; k++) {
    if ((total[k] as number) === 0 || (claimants[k] as number[]).length > 0) continue;
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (!primary[i]) continue;
      const share = ((inPadded[i] as Float64Array)[k] as number) / (total[k] as number);
      if (
        share >= R.extraInside &&
        (best < 0 || share > ((inPadded[best] as Float64Array)[k] as number) / (total[k] as number))
      )
        best = i;
    }
    extraOf[k] = best;
  }

  const pixels = new Float64Array(n);
  const kept = new Float64Array(items);
  const x0 = new Array<number>(n).fill(width);
  const y0 = new Array<number>(n).fill(height);
  const x1 = new Array<number>(n).fill(-1);
  const y1 = new Array<number>(n).fill(-1);
  for (let y = 0, p = 0; y < height; y++) {
    for (let x = 0; x < width; x++, p++) {
      const k = labels[p] as number;
      if (k === 0 || k >= items) continue;
      const claimed = claimants[k] as number[];
      let to = -1;
      if (claimed.length === 1) {
        const i = claimed[0] as number;
        if (inside(padded[i] as Rect, x, y)) to = i;
      } else if (claimed.length > 1) {
        let near = Number.POSITIVE_INFINITY;
        for (const i of claimed) {
          if (!inside(padded[i] as Rect, x, y)) continue;
          const d = reach(tight[i] as Rect, x, y);
          if (d < near) {
            near = d;
            to = i;
          }
        }
      } else {
        const i = extraOf[k] as number;
        if (i >= 0 && inside(padded[i] as Rect, x, y)) to = i;
      }
      if (to < 0) continue;
      owner[p] = to + 1;
      pixels[to] = (pixels[to] as number) + 1;
      kept[k] = (kept[k] as number) + 1;
      if (x < (x0[to] as number)) x0[to] = x;
      if (x > (x1[to] as number)) x1[to] = x;
      if (y < (y0[to] as number)) y0[to] = y;
      if (y > (y1[to] as number)) y1[to] = y;
    }
  }

  const verdicts: CutVerdict[] = boxes.map((_, i) => {
    const k = primary[i] as number;
    if (!k) return { cut: false, reason: 'miss' };
    const claimed = claimants[k] as number[];
    const share = (kept[k] as number) / (total[k] as number);
    if (claimed.length > 1 && share < R.minCovered) return { cut: false, reason: 'split' };
    if (claimed.length === 1 && share < R.minInside) return { cut: false, reason: 'outside' };
    const count = pixels[i] as number;
    if (count < R.minFill * area(tight[i] as Rect)) return { cut: false, reason: 'miss' };
    if (count >= R.maxFill * area(padded[i] as Rect)) return { cut: false, reason: 'full' };
    return {
      cut: true,
      pixels: count,
      shared: claimed.length > 1,
      bounds: {
        left: x0[i] as number,
        top: y0[i] as number,
        width: (x1[i] as number) - (x0[i] as number) + 1,
        height: (y1[i] as number) - (y0[i] as number) + 1,
      },
    };
  });

  // A piece that keeps its rectangle keeps no pixels.
  if (verdicts.some((v) => !v.cut)) {
    for (let p = 0; p < owner.length; p++) {
      const o = owner[p] as number;
      if (o && !(verdicts[o - 1] as CutVerdict).cut) owner[p] = 0;
    }
  }
  return { owner, verdicts };
}

// What the read job leaves on a crop for the renderer: every box of the photo that may be cut
// out (a piece worn on a person never is), and which of them this crop is.
export interface CutPlan {
  route: CutoutRoute;
  index: number;
  boxes: PieceBox[];
  // The read that found the piece, so its cutout is filed against the same job in the ledger.
  jobId?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const isBox = (v: unknown): v is PieceBox =>
  !!v &&
  typeof v === 'object' &&
  (['x', 'y', 'w', 'h'] as const).every((key) => {
    const n = (v as Record<string, unknown>)[key];
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
  });

// Read back defensively: the plan is stored as JSON on the crop's row.
export function asCutPlan(value: unknown): CutPlan | null {
  if (!value || typeof value !== 'object') return null;
  const { route, index, boxes, jobId } = value as Record<string, unknown>;
  if (!(CUTOUT_ROUTES as readonly unknown[]).includes(route)) return null;
  if (!Array.isArray(boxes) || boxes.length === 0 || boxes.length > 8 || !boxes.every(isBox)) {
    return null;
  }
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= boxes.length) {
    return null;
  }
  const job = typeof jobId === 'string' && UUID.test(jobId) ? { jobId } : {};
  return { route: route as CutoutRoute, index, boxes, ...job };
}
