import {
  assignLift,
  type CutoutMiss,
  type CutoutRoute,
  type CutPlan,
  type LabelMap,
  LIFT_LABEL_STEP,
  LIFT_MAX_BYTES,
  LIFT_MAX_EDGE,
  LIFT_MAX_ITEMS,
} from '@robes/core/cutout';
import sharp from 'sharp';
import { detectImageFormat } from './detect';

// A piece cut out of her photograph (cutout brief, 21 Nov 2026): the pixels of the photo that
// the lift and the read's boxes agree are this piece, on a see-through ground. Nothing is drawn
// or filled in; a piece the rules in @robes/core/cutout turn down keeps its rectangle.

export const CUTOUT_LIMITS = {
  // The stored cutout's long edge: a piece page on a phone, and a reference for a drawn look.
  edge: 1280,
  // Under this many pixels a side there is no piece to show.
  minEdge: 48,
  // The lift and the photo must be the same shape, to within this share.
  aspectSlack: 0.02,
  // The white margin round the piece in the picture the drawing step is shown.
  referenceMargin: 0.04,
} as const;

// Why no cutout was stored. Codes only: they ride the cost ledger.
export type CutoutFallback = CutoutMiss | 'no_lift' | 'bad_lift' | 'too_small' | 'error';

export type CutoutOutcome = (
  | { status: 'ok'; shared: boolean }
  | { status: 'fallback'; reason: CutoutFallback }
) & {
  route: CutoutRoute;
  latencyMs: number;
  // The read job that found the piece.
  jobId?: string | undefined;
};

export interface Lift extends LabelMap {
  // How much of each pixel is its lifted item, 0–255: the soft edge.
  matte: Uint8Array;
}

class BadLift extends Error {}

// The lift her phone uploaded, read into labels and a matte. It is hers to send, so it is
// checked like any upload: its size, that it is a PNG, its dimensions.
export async function decodeLift(bytes: Uint8Array): Promise<Lift> {
  if (bytes.byteLength > LIFT_MAX_BYTES || detectImageFormat(bytes) !== 'png') throw new BadLift();
  let decoded: { data: Buffer; info: { width: number; height: number; channels: number } };
  try {
    decoded = await sharp(bytes, {
      limitInputPixels: LIFT_MAX_EDGE * LIFT_MAX_EDGE,
      failOn: 'error',
    })
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new BadLift();
  }
  const { data, info } = decoded;
  if (info.channels < 3 || Math.max(info.width, info.height) > LIFT_MAX_EDGE) throw new BadLift();
  const count = info.width * info.height;
  const labels = new Uint8Array(count);
  const matte = new Uint8Array(count);
  for (let p = 0, o = 0; p < count; p++, o += info.channels) {
    const item = Math.round((data[o] as number) / LIFT_LABEL_STEP);
    if (item < 1 || item > LIFT_MAX_ITEMS) continue;
    labels[p] = item;
    matte[p] = data[o + 1] as number;
  }
  return { width: info.width, height: info.height, labels, matte };
}

export interface Cutout {
  // WebP with transparency.
  cutout: Buffer;
  // The same picture on white, as a JPEG.
  reference: Buffer;
  shared: boolean;
}

export type CutResult = { ok: true; value: Cutout } | { ok: false; reason: CutoutFallback };

// One piece of the plan cut out of `photo` (the upright photograph the boxes were read from).
export async function cutOut(
  photo: Uint8Array,
  liftBytes: Uint8Array,
  plan: CutPlan,
): Promise<CutResult> {
  let lift: Lift;
  try {
    lift = await decodeLift(liftBytes);
  } catch (err) {
    if (err instanceof BadLift) return { ok: false, reason: 'bad_lift' };
    throw err;
  }
  const meta = await sharp(photo).metadata();
  const { width, height } = meta;
  if (!width || !height) return { ok: false, reason: 'error' };
  const slack = Math.abs(lift.width / lift.height - width / height) / (width / height);
  if (slack > CUTOUT_LIMITS.aspectSlack) return { ok: false, reason: 'bad_lift' };

  const { owner, verdicts } = assignLift(lift, plan.boxes);
  const verdict = verdicts[plan.index];
  if (!verdict) return { ok: false, reason: 'error' };
  if (!verdict.cut) return { ok: false, reason: verdict.reason };

  // The piece's own pixels of the matte, over its bounds in the lift…
  const b = verdict.bounds;
  const alpha = Buffer.alloc(b.width * b.height);
  const mine = plan.index + 1;
  for (let y = 0; y < b.height; y++) {
    const row = (b.top + y) * lift.width + b.left;
    for (let x = 0; x < b.width; x++) {
      if (owner[row + x] === mine) alpha[y * b.width + x] = lift.matte[row + x] as number;
    }
  }
  // …scaled to the same region of the photograph.
  const sx = width / lift.width;
  const sy = height / lift.height;
  const left = Math.min(width - 1, Math.round(b.left * sx));
  const top = Math.min(height - 1, Math.round(b.top * sy));
  const region = {
    left,
    top,
    width: Math.max(1, Math.min(width - left, Math.round(b.width * sx))),
    height: Math.max(1, Math.min(height - top, Math.round(b.height * sy))),
  };
  if (Math.min(region.width, region.height) < CUTOUT_LIMITS.minEdge) {
    return { ok: false, reason: 'too_small' };
  }
  const scaled = await sharp(alpha, { raw: { width: b.width, height: b.height, channels: 1 } })
    .resize(region.width, region.height, { fit: 'fill' })
    .raw()
    .toBuffer();
  const cut = await sharp(photo)
    .extract(region)
    .joinChannel(scaled, { raw: { width: region.width, height: region.height, channels: 1 } })
    .png()
    .toBuffer();
  const sized = sharp(cut).resize({
    width: CUTOUT_LIMITS.edge,
    height: CUTOUT_LIMITS.edge,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const cutout = await sized.clone().webp({ quality: 86, alphaQuality: 90 }).toBuffer();
  const margin = Math.round(
    Math.min(CUTOUT_LIMITS.edge, Math.max(region.width, region.height)) *
      CUTOUT_LIMITS.referenceMargin,
  );
  const reference = await sized
    .clone()
    .flatten({ background: '#ffffff' })
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background: '#ffffff' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return { ok: true, value: { cutout, reference, shared: verdict.shared } };
}
