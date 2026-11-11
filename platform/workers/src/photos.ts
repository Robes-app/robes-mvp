import type { SystemRepositories } from '@robes/db';
import type { PhotoFetchResult } from '@robes/jobs';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';

export interface PhotoStoreDeps {
  jobs: Pick<SystemRepositories['jobs'], 'attachPhoto'>;
  storage: Pick<MediaStorage, 'putObject'>;
  // Dev only: renders the stored photo in-process (in AWS the S3 event does).
  onStored?: (key: string) => Promise<void>;
}

// The fetcher's reply for a receipt line's photo (SEC-40): the outcome is attached to the queued
// receipt_read job, and the bytes land as the original of the job's pending asset under uploads/,
// so the rendition pipeline checks and renders them exactly as it would her own upload. False when
// no queued receipt read matches (the message is dropped). A storage error throws, so SQS retries.
export async function storeFetchedPhoto(
  deps: PhotoStoreDeps,
  jobId: string,
  result: PhotoFetchResult,
): Promise<boolean> {
  if (!result.ok) {
    return (
      (await deps.jobs.attachPhoto(jobId, { stored: false, reason: result.reason })) !== undefined
    );
  }
  const job = await deps.jobs.attachPhoto(jobId, { stored: true });
  if (!job) return false;
  const key = mediaKeys.original(job.userId, job.assetId);
  await deps.storage.putObject(key, Buffer.from(result.data, 'base64'), {
    contentType: result.contentType,
  });
  await deps.onStored?.(key);
  return true;
}
