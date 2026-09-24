import { processUpload } from '@robes/media/process';
import { createMediaBucket, createMediaStorage, type MediaStorage } from '@robes/media/storage';
import { workerContext } from '../context';

interface S3EventRecord {
  s3: { object: { key: string } };
}
export interface S3Event {
  Records: S3EventRecord[];
}

let storage: MediaStorage | undefined;

function mediaStorage(): MediaStorage {
  const bucket = process.env.MEDIA_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) throw new Error('MEDIA_BUCKET and AWS_REGION are required');
  storage ??= createMediaStorage(createMediaBucket({ bucket, region }));
  return storage;
}

// S3 keys in events are URL-encoded with '+' for spaces.
export function decodeS3Key(key: string): string {
  return decodeURIComponent(key.replace(/\+/g, ' '));
}

// S3 ObjectCreated on uploads/ and generated/ (async invoke). Storage/DB errors throw so Lambda
// retries and then routes the event to the rendition DLQ; bad images are marked failed instead.
export async function handler(event: S3Event, deps?: { storage: MediaStorage }): Promise<void> {
  const ctx = await workerContext();
  const store = deps?.storage ?? mediaStorage();
  for (const record of event.Records) {
    const key = decodeS3Key(record.s3.object.key);
    const result = await processUpload({ storage: store, assets: ctx.system.assets }, key);
    ctx.logger.info({ ...result }, 'rendition');
  }
}
