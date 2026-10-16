import 'server-only';
import { createSystemRepositories } from '@robes/db';
import { processAccountDeletions } from '@robes/jobs';
import { db } from './db';
import { logger } from './logger';
import { mediaStorage } from './media';

// Dev stand-in for the account-deletion schedule (maintenanceFn); never used when deployed.
export async function runDeletionsLocally(): Promise<void> {
  await processAccountDeletions(
    {
      deletions: createSystemRepositories(db).accountDeletion,
      storage: mediaStorage,
      logger,
      // Drain the whole queue: dev has no schedule to pick up the rest later.
    },
    1000,
  );
}
