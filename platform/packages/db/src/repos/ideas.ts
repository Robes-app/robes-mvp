import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

const IDEA_COLUMNS = [
  'id',
  'type',
  'title',
  'subtitle',
  'data',
  'generationJobId',
  'savedAt',
  'expiresAt',
  'createdAt',
  'updatedAt',
] as const;

// Looks › Ideas: Robes' output she hasn't saved yet (and saved ideas).
export function ideasRepo(db: Db) {
  // A suggested-look set is a generation record, not an idea she browses.
  const active = () =>
    db
      .selectFrom('artifacts')
      .where('type', '=', 'idea')
      .where('deletedAt', 'is', null)
      .where(sql<boolean>`not (data ? 'set')`);

  return {
    get(userId: UserId, id: string) {
      return active()
        .select(IDEA_COLUMNS)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    list(userId: UserId, limit: number) {
      return active()
        .select(IDEA_COLUMNS)
        .where('userId', '=', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .execute();
    },

    async save(userId: UserId, id: string) {
      return db
        .updateTable('artifacts')
        .set({ savedAt: sql`coalesce(saved_at, now())`, expiresAt: null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('type', '=', 'idea')
        .where('deletedAt', 'is', null)
        .returning(IDEA_COLUMNS)
        .executeTakeFirst();
    },

    async remove(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('artifacts')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('type', '=', 'idea')
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },
  };
}
