import { targetUrl } from '../db';
import { resetTarget } from '../reset';
import { flag, print } from './args';

// pnpm migrate:reset --confirm-wipe — deletes every user in the target (and all she owns).
// A remote target also needs ROBES_MIGRATE_PRODUCTION=<its host> (db.ts).
if (flag('confirm-wipe') !== 'true') {
  console.error('migrate:reset deletes every user in the target; pass --confirm-wipe to run it');
  process.exit(1);
}
print(await resetTarget(targetUrl()));
