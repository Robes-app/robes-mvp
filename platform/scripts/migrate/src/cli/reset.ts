import { isLocal, targetId } from '../db';
import { resetTarget } from '../reset';
import { cliTarget, flag, print } from './args';

// pnpm migrate:reset --confirm-wipe — deletes every user in the target (and all she owns).
// A remote target also needs --target=production|staging, ROBES_MIGRATE_<TARGET>=<user@host> (db.ts),
// and the same user@host typed again into the wipe: --confirm-wipe=<user@host>.
const target = cliTarget();
const confirm = flag('confirm-wipe');
const host = targetId(target);
const ok = isLocal(target) ? confirm === 'true' || confirm === host : confirm === host;
if (!ok) {
  console.error(
    isLocal(target)
      ? 'migrate:reset deletes every user in the target; pass --confirm-wipe to run it'
      : `migrate:reset on ${host} deletes every user there; pass --confirm-wipe=${host} to run it`,
  );
  process.exit(1);
}
print(await resetTarget(target));
