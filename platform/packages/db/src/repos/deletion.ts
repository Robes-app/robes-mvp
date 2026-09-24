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
