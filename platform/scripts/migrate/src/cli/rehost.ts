import { targetUrl } from '../db';
import { planRehost } from '../rehost';
import { flag, print } from './args';

// pnpm migrate:rehost --dry-run — what the Cloudinary → S3 copy would do. Only dry runs exist.
if (!flag('dry-run')) {
  console.error('rehost only supports --dry-run for now (docs/migration.md §3 step 5)');
  process.exit(1);
}
const plan = await planRehost(targetUrl());
print({ count: plan.length, items: plan });
