import type { SystemRepositories, UserId } from '@robes/db';
import type { JobLogger } from '../logger';

export type RequestPhoto = (photo: { jobId: string; url: string }) => Promise<void>;

// One receipt's photos: a receipt_read job per waiting line with a photo, each asked of the
// isolated fetcher (SEC-40). Returns how many were asked for.
export async function askForPhotos(
  deps: {
    intake: Pick<SystemRepositories['inboxIntake'], 'queuePhotoReads'>;
    requestPhoto: RequestPhoto;
  },
  userId: UserId,
  inboxId: string,
): Promise<number> {
  const queued = await deps.intake.queuePhotoReads(userId, inboxId);
  for (const photo of queued) await deps.requestPhoto(photo);
  return queued.length;
}

export interface ReceiptPhotosDeps {
  intake: Pick<SystemRepositories['inboxIntake'], 'awaitingPhotos' | 'queuePhotoReads'>;
  requestPhoto: RequestPhoto;
  logger: JobLogger;
}

// Hourly (infra `receipt-photos`): receipts still waiting with photos never asked for (read before
// photos were, or a request that didn't go) get them now. A receipt that fails is logged and left
// for the next hour; the rest still go.
export async function queueReceiptPhotos(deps: ReceiptPhotosDeps): Promise<number> {
  let asked = 0;
  for (const { userId, inboxId } of await deps.intake.awaitingPhotos()) {
    try {
      asked += await askForPhotos(deps, userId, inboxId);
    } catch (err) {
      deps.logger.warn(
        { inboxId, reason: err instanceof Error ? err.message : 'unknown' },
        'receipt_photos_failed',
      );
    }
  }
  deps.logger.info({ asked }, 'receipt_photos_queued');
  return asked;
}
