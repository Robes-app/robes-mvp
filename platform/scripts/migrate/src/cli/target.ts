import { REHEARSAL_TARGET_DB } from '../db';
import { recreateTarget } from '../target';

// pnpm migrate:target — a fresh local target from db/migrations.
await recreateTarget(REHEARSAL_TARGET_DB);
console.log(`built ${REHEARSAL_TARGET_DB}`);
