import { randomBytes } from 'node:crypto';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

export type ShareSubject = 'look' | 'artifact';

// SEC-13: 128 random bits, url-safe, minted here and nowhere else.
export function mintShareToken(): string {
  return randomBytes(16).toString('base64url');
}

// Her shares; one active share per subject, so sharing again returns the same link.
export function sharesRepo(db: Db) {
  return {
    async create(
      userId: UserId,
      share: { subjectType: ShareSubject; subjectId: string; snapshot: Record<string, unknown> },
    ) {
      return db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('shares')
          .select(['token', 'createdAt'])
          .where('ownerId', '=', userId)
          .where('subjectType', '=', share.subjectType)
          .where('subjectId', '=', share.subjectId)
          .where('revokedAt', 'is', null)
          .executeTakeFirst();
        if (existing) return { ...existing, created: false };
        const row = await trx
          .insertInto('shares')
          .values({
            token: mintShareToken(),
            ownerId: userId,
            subjectType: share.subjectType,
            subjectId: share.subjectId,
            snapshot: JSON.stringify(share.snapshot),
          })
          .returning(['token', 'createdAt'])
          .executeTakeFirstOrThrow();
        return { ...row, created: true };
      });
    },

    async revoke(userId: UserId, token: string): Promise<boolean> {
      const res = await db
        .updateTable('shares')
        .set({ revokedAt: sql`now()` })
        .where('ownerId', '=', userId)
        .where('token', '=', token)
        .where('revokedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },
  };
}

// Public read by token only (the token is the capability); returns the whitelisted snapshot.
export function publicSharesRepo(db: Db) {
  return {
    async view(token: string) {
      return db
        .updateTable('shares')
        .set({ viewCount: sql`view_count + 1` })
        .where('token', '=', token)
        .where('revokedAt', 'is', null)
        .where((eb) => eb.or([eb('expiresAt', 'is', null), eb('expiresAt', '>', sql<Date>`now()`)]))
        .returning(['ownerId', 'subjectType', 'snapshot', 'legacyToken', 'createdAt'])
        .executeTakeFirst();
    },
  };
}
