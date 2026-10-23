import { createMediaBucket, createMediaStorage } from '@robes/media/storage';
import { targetUrl } from '../db';
import { applyRehost, planRehost } from '../rehost';
import { flag, print } from './args';

// pnpm migrate:rehost --dry-run — what the Cloudinary → S3 copy would do.
// pnpm migrate:rehost --apply --bucket=<media bucket> — does it, with the admin AWS creds in env.
if (flag('dry-run')) {
  const plan = await planRehost(targetUrl());
  print({ count: plan.length, items: plan });
} else if (flag('apply')) {
  const bucket = flag('bucket') ?? process.env.MEDIA_BUCKET;
  if (!bucket || bucket === 'true') {
    console.error('rehost --apply needs --bucket=<media bucket> (or MEDIA_BUCKET)');
    process.exit(1);
  }
  const storage = createMediaStorage(createMediaBucket({ bucket, region: 'eu-west-1' }));
  print(await applyRehost(targetUrl(), storage));
} else {
  console.error('pass --dry-run or --apply --bucket=<media bucket> (docs/migration.md §3 step 5)');
  process.exit(1);
}
