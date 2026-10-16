import 'server-only';
import { createSystemRepositories } from '@robes/db';
import { processDataExports } from '@robes/jobs';
import { db } from './db';
import { logger } from './logger';
import { mediaStorage } from './media';

// Dev stand-in for the data-export schedule (maintenanceFn); never used when deployed.
export async function runExportsLocally(): Promise<void> {
  await processDataExports(
    { exports: createSystemRepositories(db).dataExport, storage: mediaStorage, logger },
    // Drain the whole queue: dev has no schedule to pick up the rest later.
    1000,
  );
}
