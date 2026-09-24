// Creates the local MinIO buckets (dev + tests) if they don't exist. Private: no bucket policy.
import { createMediaBucket } from '../src/storage';
import { ensureBucket } from '../test/ensure-bucket';
import { LOCAL_S3 } from '../test/local-s3';

const args = process.argv.slice(2);
const names = args.length > 0 ? args : ['robes-dev-media', LOCAL_S3.bucket];

for (const name of names) {
  const result = await ensureBucket(createMediaBucket({ ...LOCAL_S3, bucket: name }));
  console.log(`media: bucket ${name} ${result}`);
}
