import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

// Account deletion requests; the deletion job itself runs in M6 (SEC-80).
export function deletionRepo(db: Db) {
  return {
    get(userId: UserId) {
      return db
        .selectFrom('accountDeletionRequests')
        .select(['status', 'requestedAt'])
        .where('userId', '=', userId)
        .executeTakeFirst();
    },

    // Idempotent: a repeat request returns the original one.
    async request(userId: UserId) {
      const inserted = await db
        .insertInto('accountDeletionRequests')
        .values({ userId })
        .onConflict((oc) => oc.column('userId').doNothing())
        .returning(['status', 'requestedAt'])
        .executeTakeFirst();
      return inserted ?? (await this.get(userId));
    },
  };
}

// Worker side (SEC-80): claims one request at a time; a crashed run is retried after 15 minutes.
export function accountDeletionRepo(db: Db) {
  return {
    async claimNext({ retryAfterMinutes = 15 } = {}): Promise<UserId | undefined> {
      const row = await db
        .updateTable('accountDeletionRequests')
        .set({ status: 'running', updatedAt: sql`now()` })
        .where(
          'userId',
          '=',
          db
            .selectFrom('accountDeletionRequests')
            .select('userId')
            .where((eb) =>
              eb.or([
                eb('status', '=', 'requested'),
                eb.and([
                  eb('status', 'in', ['running', 'failed']),
                  eb(
                    'updatedAt',
                    '<',
                    sql<Date>`now() - make_interval(mins => ${retryAfterMinutes})`,
                  ),
                ]),
              ]),
            )
            .orderBy('requestedAt')
            .limit(1)
            .forUpdate()
            .skipLocked(),
        )
        .returning('userId')
        .executeTakeFirst();
      return row?.userId as UserId | undefined;
    },

    async fail(userId: UserId, reason: string): Promise<void> {
      await db
        .updateTable('accountDeletionRequests')
        .set({ status: 'failed', detail: JSON.stringify({ reason: reason.slice(0, 200) }) })
        .where('userId', '=', userId)
        .execute();
    },

    // The last step: an audit row that outlives her, then the user row, which cascades everything.
    async complete(userId: UserId, detail: Record<string, unknown>): Promise<void> {
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto('auditLog')
          .values({
            action: 'account.deleted',
            subjectTable: 'users',
            subjectId: userId,
            detail: JSON.stringify(detail),
          })
          .execute();
        await trx.deleteFrom('users').where('id', '=', userId).execute();
      });
    },
  };
}
