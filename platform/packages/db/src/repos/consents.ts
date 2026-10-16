import type { ConsentKind, ConsentSource } from '@robes/core';
import type { Db } from '../client';
import type { UserId } from '../ids';

export type ConsentAnswers = Partial<Record<ConsentKind, boolean>>;

// Append-only (SEC-84): each answer is a new row; the latest row per kind is current.
export function consentsRepo(db: Db) {
  return {
    async record(
      userId: UserId,
      answers: ConsentAnswers,
      source: ConsentSource,
    ): Promise<ConsentAnswers> {
      const rows = Object.entries(answers).map(([kind, granted]) => ({
        userId,
        kind,
        granted: Boolean(granted),
        source,
      }));
      if (rows.length > 0) await db.insertInto('consents').values(rows).execute();
      return answers;
    },

    async current(userId: UserId): Promise<ConsentAnswers> {
      const rows = await db
        .selectFrom('consents')
        .distinctOn('kind')
        .select(['kind', 'granted'])
        .where('userId', '=', userId)
        .orderBy('kind')
        .orderBy('createdAt', 'desc')
        .execute();
      return Object.fromEntries(rows.map((r) => [r.kind, r.granted])) as ConsentAnswers;
    },
  };
}
