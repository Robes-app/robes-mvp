import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import type { JobLogger } from './logger';

export interface DeletionDeps {
  deletions: SystemRepositories['accountDeletion'];
  storage: Pick<MediaStorage, 'deletePrefix'>;
  logger: JobLogger;
}

// SEC-80: files first, then the user row (cascading every table). Each step is idempotent, so a
// failed run is simply claimed again later.
export async function processAccountDeletions(deps: DeletionDeps, limit = 10): Promise<number> {
  let done = 0;
  for (let i = 0; i < limit; i++) {
    const userId = await deps.deletions.claimNext();
    if (!userId) break;
    try {
      let objects = 0;
      for (const prefix of mediaKeys.userPrefixes(userId))
        objects += await deps.storage.deletePrefix(prefix);
      await deps.deletions.complete(userId, { objects });
      deps.logger.info({ objects }, 'account_deleted');
      done++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await deps.deletions.fail(userId, reason);
      deps.logger.error({ reason }, 'account_deletion_failed');
    }
  }
  return done;
}
