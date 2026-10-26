import { isLocal } from '../db';
import { resetTarget } from '../reset';
import { cliTarget, flag, print } from './args';

// pnpm migrate:reset --confirm-wipe — deletes every user in the target (and all she owns).
// A remote target also needs --target=production, ROBES_MIGRATE_PRODUCTION=<its host> (db.ts), and
// the host typed again into the wipe: --confirm-wipe=<host>.
const target = cliTarget();
const confirm = flag('confirm-wipe');
const host = new URL(target).hostname;
const ok = isLocal(target) ? confirm === 'true' || confirm === host : confirm === host;
if (!ok) {
  console.error(
    isLocal(target)
      ? 'migrate:reset deletes every user in the target; pass --confirm-wipe to run it'
      : `migrate:reset on ${host} deletes every user in production; pass --confirm-wipe=${host} to run it`,
  );
  process.exit(1);
}
print(await resetTarget(target));
