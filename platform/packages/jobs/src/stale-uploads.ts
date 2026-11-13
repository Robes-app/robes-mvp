import { type SystemRepositories, verifiedUserId } from '@robes/db';
import { deleteAssetObjects, type MediaStorage } from '@robes/media/storage';
import type { JobLogger } from './logger';

// D20 (Annie, 6 Nov): a look photo she picks in image mode uploads at once but is only attached on
// Update look. Her Discard marks it deleted (uploads.discard); this deletes its files and row, and
// catches the rest — the app closed first, or the discard failed — once a day old. Nothing anything
// holds is touched. Runs hourly (infra `stale-uploads`), here because only the maintenance role
// may delete media. Uploads older than STALE_UPLOAD_WITHIN_DAYS and never discarded are left, so
// the photos on her looks aren't re-checked forever.
export const STALE_UPLOAD_HOURS = 24;
export const STALE_UPLOAD_WITHIN_DAYS = 7;
export const STALE_UPLOADS_PAGE = 100;

export interface StaleUploadsDeps {
  uploads: SystemRepositories['staleUploads'];
  storage: Pick<MediaStorage, 'deleteObject' | 'deletePrefix'>;
  logger: JobLogger;
  // At most this many pages per run (a backstop; the next run carries on).
  maxPages?: number;
}

export async function sweepStaleUploads(
  deps: StaleUploadsDeps,
): Promise<{ deleted: number; kept: number; failed: number }> {
  let deleted = 0;
  let kept = 0;
  let failed = 0;
  let afterId: string | undefined;
  const opts = { olderThanHours: STALE_UPLOAD_HOURS, withinDays: STALE_UPLOAD_WITHIN_DAYS };
  for (let page = 0; page < (deps.maxPages ?? 20); page++) {
    const due = await deps.uploads.due({ ...opts, limit: STALE_UPLOADS_PAGE, afterId });
    for (const asset of due) {
      try {
        const outcome = await deps.uploads.discard(
          verifiedUserId(asset.userId),
          asset.id,
          opts,
          (userId, assetId) => deleteAssetObjects(deps.storage, userId, assetId),
        );
        if (outcome === 'discarded') deleted++;
        else kept++;
      } catch (err) {
        failed++;
        deps.logger.warn(
          { reason: err instanceof Error ? err.message.slice(0, 60) : 'unknown' },
          'stale_upload_failed',
        );
      }
    }
    afterId = due.at(-1)?.id;
    if (due.length < STALE_UPLOADS_PAGE) break;
  }
  // Her twin's photos and the twins drawn from them, deleted at her ask (model.deleteTwin): their
  // files go once the 30 days in which the twin can be put back are up, with its archive.
  await deps.uploads.purgeTwinArchives();
  afterId = undefined;
  for (let page = 0; page < (deps.maxPages ?? 20); page++) {
    const due = await deps.uploads.dueRemoved({ limit: STALE_UPLOADS_PAGE, afterId });
    for (const asset of due) {
      try {
        const outcome = await deps.uploads.discardRemoved(
          verifiedUserId(asset.userId),
          asset.id,
          (userId, assetId) => deleteAssetObjects(deps.storage, userId, assetId),
        );
        if (outcome === 'discarded') deleted++;
        else kept++;
      } catch (err) {
        failed++;
        deps.logger.warn(
          { reason: err instanceof Error ? err.message.slice(0, 60) : 'unknown' },
          'removed_photo_failed',
        );
      }
    }
    afterId = due.at(-1)?.id;
    if (due.length < STALE_UPLOADS_PAGE) break;
  }
  if (deleted || failed) deps.logger.info({ deleted, kept, failed }, 'stale_uploads_swept');
  return { deleted, kept, failed };
}
