import { MAX_UPLOAD_BYTES } from '@robes/contracts';
import type { PieceBox } from '@robes/core/photo-pieces';
import { detectImageFormat } from './detect';
import { mediaKeys, parseOriginalKey } from './keys';
import type { RenditionManifest } from './manifest';
import { cropImage, RejectedImage, type RejectReason, renderImage } from './render';
import type { MediaStorage } from './storage';

export { cropImage, IMAGE_LIMITS, RejectedImage, type RejectReason, renderImage } from './render';

const CONTENT_TYPES = { avif: 'image/avif', webp: 'image/webp' } as const;
// Keys are immutable per asset, so caches may keep them for good.
const CACHE_CONTROL = 'private, max-age=31536000, immutable';

// Structurally matches `createSystemRepositories(db).assets`.
export interface AssetStore {
  get(
    assetId: string,
  ): Promise<{ userId: string | null; status: string; crop?: unknown } | undefined>;
  markReady(
    assetId: string,
    meta: {
      bucketKey: string;
      width: number;
      height: number;
      blurhash: string;
      renditions: RenditionManifest;
    },
  ): Promise<void>;
  markFailed(assetId: string, error: string): Promise<void>;
}

export interface ProcessUploadDeps {
  storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
  assets: AssetStore;
}

export type ProcessResult =
  | { status: 'ready'; assetId: string; manifest: RenditionManifest }
  | { status: 'failed'; assetId: string; reason: RejectReason }
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

// Safe to re-run for the same key: outputs are deterministic and only pending assets are processed.
// Storage/DB errors propagate so the invoker retries; bad images are marked failed.
export async function processUpload(deps: ProcessUploadDeps, key: string): Promise<ProcessResult> {
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

  let rendered: Awaited<ReturnType<typeof renderImage>>;
  try {
    const crop = asCrop(asset.crop);
    rendered = crop
      ? await renderImage(await cropImage(original, crop), 'jpeg')
      : await renderImage(original, format);
  } catch (err) {
    if (err instanceof RejectedImage) return fail(err.reason);
    throw err;
  }

  const masterKey = mediaKeys.master(userId, assetId);
  await Promise.all([
    deps.storage.putObject(masterKey, rendered.master.data, {
      contentType: 'image/jpeg',
      cacheControl: CACHE_CONTROL,
    }),
    ...rendered.renditions.map((r) =>
      deps.storage.putObject(mediaKeys.rendition(userId, assetId, r.width, r.format), r.data, {
        contentType: CONTENT_TYPES[r.format],
        cacheControl: CACHE_CONTROL,
      }),
    ),
  ]);

  const { width, height } = rendered.master;
  const manifest: RenditionManifest = {
    v: 1,
    master: { width, height },
    widths: [...new Set(rendered.renditions.map((r) => r.width))],
  };
  await deps.assets.markReady(assetId, {
    bucketKey: masterKey,
    width,
    height,
    blurhash: rendered.blurhash,
    renditions: manifest,
  });
  return { status: 'ready', assetId, manifest };
}
