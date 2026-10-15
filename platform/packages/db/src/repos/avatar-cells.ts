import { sql } from 'kysely';
import type { Db } from '../client';

// A generation that hasn't finished in this long is treated as abandoned (its job died).
const STALE_CLAIM = sql<Date>`now() - interval '10 minutes'`;

// The shared catalog of model reference portraits. Keys come from catalog picks only (no one's
// photo, no user id), so reads and claims are safe across users (SEC-22).
export function avatarCellsRepo(db: Db) {
  return {
    get(key: string) {
      return db
        .selectFrom('avatarCells')
        .select(['id', 'status', 'bucketKey', 'contentType', 'jobId', 'claimedAt'])
        .where('id', '=', key)
        .executeTakeFirst();
    },

    // True when this caller should generate the cell: nobody has, or the last try failed or died.
    async claim(key: string): Promise<boolean> {
      const row = await db
        .insertInto('avatarCells')
        .values({ id: key, status: 'pending', claimedAt: sql`now()` })
        .onConflict((oc) =>
          oc
            .column('id')
            .doUpdateSet({ status: 'pending', claimedAt: sql`now()`, jobId: null })
            .where((eb) =>
              eb.or([
                eb('avatarCells.status', '=', 'failed'),
                eb.and([
                  eb('avatarCells.status', '=', 'pending'),
                  eb('avatarCells.claimedAt', '<', STALE_CLAIM),
                ]),
              ]),
            ),
        )
        .returning('id')
        .executeTakeFirst();
      return row !== undefined;
    },

    async setJob(key: string, jobId: string): Promise<void> {
      await db
        .updateTable('avatarCells')
        .set({ jobId })
        .where('id', '=', key)
        .where('status', '=', 'pending')
        .execute();
    },

    async ready(key: string, bucketKey: string, contentType: string): Promise<void> {
      await db
        .updateTable('avatarCells')
        .set({ status: 'ready', bucketKey, contentType })
        .where('id', '=', key)
        .execute();
    },

    async fail(key: string): Promise<void> {
      await db
        .updateTable('avatarCells')
        .set({ status: 'failed' })
        .where('id', '=', key)
        .where('status', '=', 'pending')
        .execute();
    },
  };
}
