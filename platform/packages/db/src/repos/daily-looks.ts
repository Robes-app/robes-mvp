import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

const COLUMNS = [
  'id',
  'title',
  'subtitle',
  'data',
  'generationJobId',
  'savedAt',
  'expiresAt',
  'createdAt',
] as const;

// Today › Style it for today: her daily looks (drafts until she names one).
export function dailyLooksRepo(db: Db) {
  const active = () =>
    db.selectFrom('artifacts').where('type', '=', 'daily_look').where('deletedAt', 'is', null);
  return {
    get(userId: UserId, id: string) {
      return active()
        .select(COLUMNS)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    // Naming it keeps it: no expiry. Returns false when it isn't hers.
    async markSaved(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('artifacts')
        .set({ savedAt: sql`coalesce(saved_at, now())`, expiresAt: null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('type', '=', 'daily_look')
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },
  };
}
