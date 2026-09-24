import 'server-only';
import { ApiError } from '@robes/api';
import type { Asset, CreateUploadInput, CreateUploadOutput, MediaSession } from '@robes/contracts';
import { QuotaExceeded, type Repositories, type UserId } from '@robes/db';
import { mediaKeys, RenditionManifest, renditionKeys } from '@robes/media';
import type { MediaDelivery, SessionCookie } from '@robes/media/delivery';
import type { MediaStorage } from '@robes/media/storage';

export interface UploadDeps {
  assets: Pick<Repositories['assets'], 'createPending' | 'getForUser'>;
  storage: Pick<MediaStorage, 'presignPut' | 'head'>;
  delivery: Pick<MediaDelivery, 'mode' | 'url' | 'sessionCookies'>;
  // Called once the original is in the bucket; dev renders in-process, AWS relies on the S3 event.
  onUploaded?(key: string): void;
}

type AssetRow = NonNullable<Awaited<ReturnType<UploadDeps['assets']['getForUser']>>>;

export async function createUpload(
  deps: UploadDeps,
  userId: UserId,
  input: CreateUploadInput,
): Promise<CreateUploadOutput> {
  let asset: { id: string };
  try {
    asset = await deps.assets.createPending(userId, input, {
      quota: { metric: 'upload.image', cost: 1 },
    });
  } catch (err) {
    if (!(err instanceof QuotaExceeded)) throw err;
    const retryAfterSeconds = Math.max(1, Math.ceil((err.resetAt.getTime() - Date.now()) / 1000));
    throw new ApiError('quota_exceeded', { retryAfterSeconds });
  }
  const upload = await deps.storage.presignPut(mediaKeys.original(userId, asset.id), {
    contentType: input.contentType,
    bytes: input.bytes,
  });
  return { assetId: asset.id, upload: { ...upload, expiresAt: upload.expiresAt.toISOString() } };
}

async function loadOwned(deps: UploadDeps, userId: UserId, assetId: string): Promise<AssetRow> {
  const row = await deps.assets.getForUser(userId, assetId);
  if (!row || row.status === 'deleted') throw new ApiError('not_found');
  return row;
}

async function toAsset(deps: UploadDeps, userId: UserId, row: AssetRow): Promise<Asset> {
  const status = row.status as Asset['status'];
  const manifest = status === 'ready' ? RenditionManifest.safeParse(row.renditions) : undefined;
  const keys = manifest?.success ? renditionKeys(userId, row.id, manifest.data) : undefined;
  return {
    id: row.id,
    kind: row.kind,
    status,
    width: row.width,
    height: row.height,
    blurhash: row.blurhash,
    master: keys ? await deps.delivery.url(keys.master) : null,
    renditions: keys
      ? await Promise.all(
          keys.renditions.map(async (r) => ({
            width: r.width,
            avif: await deps.delivery.url(r.avif),
            webp: await deps.delivery.url(r.webp),
          })),
        )
      : [],
  };
}

export async function getAsset(deps: UploadDeps, userId: UserId, assetId: string): Promise<Asset> {
  return toAsset(deps, userId, await loadOwned(deps, userId, assetId));
}

// Client calls this after its PUT succeeds; idempotent once the asset has left `pending`.
export async function completeUpload(
  deps: UploadDeps,
  userId: UserId,
  assetId: string,
): Promise<Asset> {
  const row = await loadOwned(deps, userId, assetId);
  if (row.status === 'pending') {
    const key = mediaKeys.original(userId, row.id);
    if (!(await deps.storage.head(key))) throw new ApiError('conflict');
    deps.onUploaded?.(key);
  }
  return toAsset(deps, userId, row);
}

export function startMediaSession(
  deps: UploadDeps,
  userId: UserId,
  setCookie: (cookie: SessionCookie) => void,
): MediaSession {
  const cookies = deps.delivery.sessionCookies(userId);
  if (deps.delivery.mode === 'local' || cookies.length === 0) return { mode: 'local' };
  for (const cookie of cookies) setCookie(cookie);
  const expiresAt = Math.min(...cookies.map((c) => c.expires.getTime()));
  return { mode: 'cookies', expiresAt: new Date(expiresAt).toISOString() };
}
