// Several pieces from one photograph (legacy 2026-10-13): pure rules shared by the read job, the
// crop renderer and both clients.

export interface PieceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const WHOLE_FRAME: PieceBox = { x: 0, y: 0, w: 1, h: 1 };
export const PHOTO_PIECES_MAX = 8;
// A wardrobe match at or above this reads as "Already yours?" in the add flow.
export const MATCH_THRESHOLD = 0.5;

function clamp01(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

// The model's box, clamped into the frame; one it could not place reads as the whole photo.
export function normaliseBox(raw: Partial<PieceBox> | null | undefined): PieceBox {
  const x = clamp01(raw?.x);
  const y = clamp01(raw?.y);
  let w = clamp01(raw?.w);
  let h = clamp01(raw?.h);
  if (x + w > 1) w = 1 - x;
  if (y + h > 1) h = 1 - y;
  if (w < 0.02 || h < 0.02) return { ...WHOLE_FRAME };
  return { x, y, w, h };
}

// The piece's own crop as fractions: 8% padding, never under 28% of the frame on a side.
export function cropRegion(box: PieceBox, pad = 0.08): PieceBox {
  let x = box.x - pad;
  let y = box.y - pad;
  let w = box.w + 2 * pad;
  let h = box.h + 2 * pad;
  if (w < 0.28) {
    x -= (0.28 - w) / 2;
    w = 0.28;
  }
  if (h < 0.28) {
    y -= (0.28 - h) / 2;
    h = 0.28;
  }
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));
  w = Math.max(0.001, Math.min(1 - x, w));
  h = Math.max(0.001, Math.min(1 - y, h));
  return { x, y, w, h };
}

// The crop in pixels of a W×H image (sharp's extract region).
export function cropPixels(
  box: PieceBox,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  const r = cropRegion(box);
  const left = Math.min(width - 1, Math.round(r.x * width));
  const top = Math.min(height - 1, Math.round(r.y * height));
  return {
    left,
    top,
    width: Math.max(1, Math.min(width - left, Math.round(r.w * width))),
    height: Math.max(1, Math.min(height - top, Math.round(r.h * height))),
  };
}

export function boxCentre(box: PieceBox): { cx: number; cy: number } {
  return { cx: box.x + box.w / 2, cy: box.y + box.h / 2 };
}

const lastWord = (label: string): string =>
  label.trim().toLowerCase().split(/\s+/).slice(-1)[0] ?? '';

interface ReadPieceLike {
  label: string;
  category: string;
  box: PieceBox;
  match: { pieceId: string; confidence: number } | null;
}

// A pair is one piece: a second Shoes entry naming the same kind (the label's last word) is the
// other foot; the first keeps the union of the boxes and a match on either survives.
export function collapsePairs<T extends ReadPieceLike>(pieces: readonly T[]): T[] {
  const out: T[] = [];
  for (const p of pieces) {
    const kind = lastWord(p.label);
    const twin =
      p.category === 'Shoes' && kind
        ? out.find((q) => q.category === 'Shoes' && lastWord(q.label) === kind)
        : undefined;
    if (!twin) {
      out.push({ ...p });
      continue;
    }
    const x = Math.min(twin.box.x, p.box.x);
    const y = Math.min(twin.box.y, p.box.y);
    const x2 = Math.max(twin.box.x + twin.box.w, p.box.x + p.box.w);
    const y2 = Math.max(twin.box.y + twin.box.h, p.box.y + p.box.h);
    twin.box = { x, y, w: x2 - x, h: y2 - y };
    if (!twin.match && p.match) twin.match = p.match;
  }
  return out;
}

// The tag's word on the photo: the item type, else the label's last word.
export function pieceWord(piece: { label: string; categoryL3: string | null }): string {
  if (piece.categoryL3) return piece.categoryL3;
  const word = piece.label.trim().split(/\s+/).slice(-1)[0] ?? '';
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
}

const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
export function countWord(n: number): string {
  return WORDS[n - 1] ?? String(n);
}

export interface TagRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

// Tags sit at their boxes' centres and pile up on a portrait photo: each is nudged clear of the
// ones placed before it (top to bottom), down first then up, and held inside the W×H frame.
export function nudgeTags(tags: readonly TagRect[], width: number, height: number): TagRect[] {
  const order = tags.map((t, i) => ({ t, i })).sort((a, b) => a.t.cy - b.t.cy);
  const placed: TagRect[] = [];
  const out: TagRect[] = new Array(tags.length);
  const hits = (r: TagRect) =>
    placed.some(
      (q) =>
        Math.abs(q.cx - r.cx) < (q.w + r.w) / 2 + 4 && Math.abs(q.cy - r.cy) < (q.h + r.h) / 2 + 4,
    );
  for (const { t, i } of order) {
    const cx = Math.min(width - t.w / 2 - 2, Math.max(t.w / 2 + 2, t.cx));
    const cy = Math.min(height - t.h / 2 - 2, Math.max(t.h / 2 + 2, t.cy));
    const r = { cx, cy, w: t.w, h: t.h };
    let dir = 1;
    let k = 1;
    while (hits(r) && k <= 8) {
      r.cy = cy + dir * k * (t.h + 6);
      if (r.cy > height - t.h / 2 - 2 || r.cy < t.h / 2 + 2) {
        if (dir === 1) {
          dir = -1;
          k = 1;
          r.cy = cy;
          continue;
        }
        r.cy = cy;
        break;
      }
      k += 1;
    }
    placed.push(r);
    out[i] = r;
  }
  return out;
}
