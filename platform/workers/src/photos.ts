import type { SystemRepositories } from '@robes/db';
import type { PhotoFetchResult } from '@robes/jobs';
import { mediaKeys } from '@robes/media';

export interface PhotoAttachDeps {
  jobs: Pick<SystemRepositories['jobs'], 'attachPhoto'>;
  // Dev only: renders the uploaded photo in-process (in AWS the S3 event does).
  onStored?: (key: string) => Promise<void>;
}

// The fetcher's reply for a product photo (SEC-40): it has already uploaded the bytes as the
// original of the job's pending asset under uploads/, through a form presigned for that key
// alone, so the rendition pipeline checks and renders them exactly as it would her own upload.
// Here the outcome is attached to the queued receipt_read job. False when no queued read
// matches (the message is dropped).
export async function attachFetchedPhoto(
  deps: PhotoAttachDeps,
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
  await deps.onStored?.(mediaKeys.original(job.userId, job.assetId));
  return true;
}
