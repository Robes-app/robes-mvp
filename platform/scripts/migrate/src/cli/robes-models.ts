import { createMediaBucket, createMediaStorage } from '@robes/media/storage';
import { applyRobesModels, planRobesModels } from '../robes-models';
import { cliTarget, flag, print } from './args';

// pnpm migrate:robes-models --dry-run — the five women's portraits and where they go.
// pnpm migrate:robes-models --apply --bucket=<media bucket> — puts them, with the admin AWS creds in
// env, against TARGET_DATABASE_URL (--target=staging|production, docs/runbooks/robes-models.md).
if (flag('dry-run')) {
  print(planRobesModels());
} else if (flag('apply')) {
  const bucket = flag('bucket') ?? process.env.MEDIA_BUCKET;
  if (!bucket || bucket === 'true') {
    console.error('robes-models --apply needs --bucket=<media bucket> (or MEDIA_BUCKET)');
    process.exit(1);
  }
  const storage = createMediaStorage(createMediaBucket({ bucket, region: 'eu-west-1' }));
  print(await applyRobesModels(cliTarget(), storage));
} else {
  console.error(
    'pass --dry-run or --apply --bucket=<media bucket> (docs/runbooks/robes-models.md)',
  );
  process.exit(1);
}
