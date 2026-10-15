import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import type { MediaBucket } from '../src/storage';

// Idempotent: local MinIO only. Deployed buckets come from CDK.
export async function ensureBucket({ client, bucket }: MediaBucket): Promise<'exists' | 'created'> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return 'exists';
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    return 'created';
  }
}
