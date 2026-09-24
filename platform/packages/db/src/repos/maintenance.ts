import { sql } from 'kysely';
import type { Db } from '../client';

export function maintenanceRepo(db: Db) {
  return {
    // SEC-82 retention sweep; the function is security definer and granted to robes_app only.
    async run(): Promise<void> {
      await sql`select private.run_maintenance()`.execute(db);
    },
  };
}
