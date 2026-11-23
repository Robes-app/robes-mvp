import { MAX_UPLOAD_BYTES } from '@robes/contracts';
import { asCutPlan, type CutPlan } from '@robes/core/cutout';
import { type PieceBox, WHOLE_FRAME } from '@robes/core/photo-pieces';
import { type CutoutFallback, type CutoutOutcome, cutOut } from './cutout';
import { detectImageFormat } from './detect';
import { mediaKeys, parseCutKey, parseOriginalKey } from './keys';
import type { RenditionManifest } from './manifest';
import {
  cropImage,
  RejectedImage,
  type RejectReason,
  type RenderedImage,
  renderFromMaster,
  renderMasterImage,
} from './render';
import { deleteAssetObjects, type MediaStorage } from './storage';

export type { CutoutFallback, CutoutOutcome } from './cutout';
export { cropImage, IMAGE_LIMITS, RejectedImage, type RejectReason, renderImage } from './render';

const CONTENT_TYPES = { avif: 'image/avif', webp: 'image/webp' } as const;
// Keys are immutable per asset, so caches may keep them for good.
const CACHE_CONTROL = 'private, max-age=31536000, immutable';

// Structurally matches `createSystemRepositories(db).assets`.
export interface AssetStore {
  get(
    assetId: string,
  ): Promise<
    | { userId: string | null; status: string; crop?: unknown; sourceAssetId?: string | null }
    | undefined
  >;
  markReady(
    assetId: string,
    meta: {
      bucketKey: string;
      width: number;
      height: number;
      blurhash: string;
      renditions: RenditionManifest;
      hasCutout?: boolean;
    },
  ): Promise<boolean>;
  markFailed(assetId: string, error: string): Promise<void>;
  // A cutout was stored beside an asset already rendered (a cut request).
  markCutout(assetId: string): Promise<boolean>;
}

export interface ProcessUploadDeps {
  storage: Pick<MediaStorage, 'getObject' | 'putObject' | 'deleteObject' | 'deletePrefix'>;
  assets: AssetStore;
  // Every cutout tried, stored or not, for the cost ledger. Its failure never fails a render.
  onCutout?(event: { userId: string; assetId: string; outcome: CutoutOutcome }): Promise<void>;
}

export type ProcessResult =
  | { status: 'ready'; assetId: string; manifest: RenditionManifest }
  | { status: 'failed'; assetId: string; reason: RejectReason }
  // A cut request answered: the piece cut out of its own photograph, or its photograph kept.
  | { status: 'cut'; assetId: string; cutout: boolean }
  | {
      status: 'skipped';
      reason: 'not_an_upload' | 'unknown_asset' | 'owner_mismatch' | 'not_pending' | 'missing';
    };

function asCrop(value: unknown): PieceBox | null {
  if (!value || typeof value !== 'object') return null;
  const { x, y, w, h } = value as Record<string, unknown>;
  return [x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))
    ? { x: x as number, y: y as number, w: w as number, h: h as number }
    : null;
}

// The piece cut out of its photograph, beside the rectangle (cutout brief, 21 Nov 2026). The
// rectangle is already stored when this runs, and whatever goes wrong here leaves it as the
// piece's picture: no error, no message.
async function storeCutout(
  deps: ProcessUploadDeps,
  ids: { userId: string; assetId: string; sourceAssetId: string },
  photo: Uint8Array,
  plan: CutPlan,
): Promise<CutoutOutcome> {
  const started = Date.now();
  const done = (reason: CutoutFallback): CutoutOutcome => ({
    route: plan.route,
    jobId: plan.jobId,
    status: 'fallback',
    reason,
    latencyMs: Date.now() - started,
  });
  try {
    const lift = await deps.storage.getObject(mediaKeys.lift(ids.userId, ids.sourceAssetId));
    if (!lift) return done('no_lift');
    const cut = await cutOut(photo, lift, plan);
    if (!cut.ok) return done(cut.reason);
    await Promise.all([
      deps.storage.putObject(mediaKeys.cutout(ids.userId, ids.assetId), cut.value.cutout, {
        contentType: 'image/webp',
        cacheControl: CACHE_CONTROL,
      }),
      deps.storage.putObject(
        mediaKeys.cutoutReference(ids.userId, ids.assetId),
        cut.value.reference,
        { contentType: 'image/jpeg', cacheControl: CACHE_CONTROL },
      ),
    ]);
    return {
      route: plan.route,
      jobId: plan.jobId,
      status: 'ok',
      shared: cut.value.shared,
      latencyMs: Date.now() - started,
    };
  } catch {
    return done('error');
  }
}

// A photograph that is itself one piece's picture (the single-photo read: Home's add, the first
// piece), cut out after the fact. The request is a copy of the photo's master; the piece is
// whatever her phone lifted in the whole frame. Safe to re-run: the cutout is deterministic.
async function processCut(
  deps: ProcessUploadDeps,
  key: string,
  { userId, assetId }: { userId: string; assetId: string },
): Promise<ProcessResult> {
  const asset = await deps.assets.get(assetId);
  if (!asset) return { status: 'skipped', reason: 'unknown_asset' };
  if (asset.userId !== userId) return { status: 'skipped', reason: 'owner_mismatch' };
  const photo = await deps.storage.getObject(key);
  if (!photo) return { status: 'skipped', reason: 'missing' };
  const outcome = await storeCutout(deps, { userId, assetId, sourceAssetId: assetId }, photo, {
    route: 'on-device',
    index: 0,
    boxes: [{ ...WHOLE_FRAME }],
  });
  const stored = outcome.status === 'ok' && (await deps.assets.markCutout(assetId));
  await deps.onCutout?.({ userId, assetId, outcome }).catch(() => {});
  return { status: 'cut', assetId, cutout: stored };
}

// Safe to re-run for the same key: outputs are deterministic and only pending assets are processed.
// Storage/DB errors propagate so the invoker retries; bad images are marked failed.
export async function processUpload(deps: ProcessUploadDeps, key: string): Promise<ProcessResult> {
  const cut = parseCutKey(key);
  if (cut) return processCut(deps, key, cut);
  const ids = parseOriginalKey(key);
  if (!ids) return { status: 'skipped', reason: 'not_an_upload' };
  const { userId, assetId } = ids;

  const asset = await deps.assets.get(assetId);
  if (!asset) return { status: 'skipped', reason: 'unknown_asset' };
  if (asset.userId !== userId) return { status: 'skipped', reason: 'owner_mismatch' };
  if (asset.status !== 'pending') return { status: 'skipped', reason: 'not_pending' };

  const original = await deps.storage.getObject(key);
  if (!original) return { status: 'skipped', reason: 'missing' };

  const fail = async (reason: RejectReason): Promise<ProcessResult> => {
    await deps.assets.markFailed(assetId, reason);
    return { status: 'failed', assetId, reason };
  };

  if (original.byteLength > MAX_UPLOAD_BYTES) return fail('too_large');
  const format = detectImageFormat(original);
  if (!format) return fail('unsupported_type');

  const crop = asCrop(asset.crop);
  let master: RenderedImage['master'];
  try {
    master = crop
      ? await renderMasterImage(await cropImage(original, crop), 'jpeg')
      : await renderMasterImage(original, format);
  } catch (err) {
    if (err instanceof RejectedImage) return fail(err.reason);
    throw err;
  }

  // The master is stored before the renditions are made: a photo read needs only the master
  // (wardrobe jobs wait for it, not for `ready`), and the renditions are most of the render time.
  const masterKey = mediaKeys.master(userId, assetId);
  await deps.storage.putObject(masterKey, master.data, {
    contentType: 'image/jpeg',
    cacheControl: CACHE_CONTROL,
  });

  let rendered: Omit<RenderedImage, 'master'>;
  try {
    rendered = await renderFromMaster(master);
  } catch (err) {
    if (!(err instanceof RejectedImage)) throw err;
    await deps.storage.deleteObject(masterKey);
    return fail(err.reason);
  }
  await Promise.all(
    rendered.renditions.map((r) =>
      deps.storage.putObject(mediaKeys.rendition(userId, assetId, r.width, r.format), r.data, {
        contentType: CONTENT_TYPES[r.format],
        cacheControl: CACHE_CONTROL,
      }),
    ),
  );

  const plan = crop ? asCutPlan((asset.crop as { cut?: unknown }).cut) : null;
  const cutout =
    plan && asset.sourceAssetId
      ? await storeCutout(
          deps,
          { userId, assetId, sourceAssetId: asset.sourceAssetId },
          original,
          plan,
        )
      : null;

  const { width, height } = master;
  const manifest: RenditionManifest = {
    v: 1,
    master: { width, height },
    widths: [...new Set(rendered.renditions.map((r) => r.width))],
  };
  const marked = await deps.assets.markReady(assetId, {
    bucketKey: masterKey,
    width,
    height,
    blurhash: rendered.blurhash,
    renditions: manifest,
    ...(cutout?.status === 'ok' ? { hasCutout: true } : {}),
  });
  // Discarded while it rendered (uploads.discard, the stale-upload sweep): its row went before
  // these files landed, so nothing else would ever remove them.
  if (!marked) {
    await deleteAssetObjects(deps.storage, userId, assetId);
    return { status: 'skipped', reason: 'unknown_asset' };
  }
  if (cutout) await deps.onCutout?.({ userId, assetId, outcome: cutout }).catch(() => {});
  return { status: 'ready', assetId, manifest };
}
