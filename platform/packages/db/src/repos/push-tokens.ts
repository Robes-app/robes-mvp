import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

export type PushPlatform = 'ios' | 'android';

// Her devices' Expo push tokens. A token belongs to one device, so registering it again (after a
// sign-in on a shared phone) moves it to whoever is signed in now.
export function pushTokensRepo(db: Db) {
  return {
    async register(
      userId: UserId,
      t: { expoToken: string; platform: PushPlatform; appVersion?: string | null | undefined },
    ): Promise<void> {
      const values = {
        userId,
        platform: t.platform,
        appVersion: t.appVersion ?? null,
        lastSeenAt: sql<Date>`now()`,
        revokedAt: null,
      };
      await db
        .insertInto('pushTokens')
        .values({ ...values, expoToken: t.expoToken })
        .onConflict((oc) => oc.column('expoToken').doUpdateSet(values))
        .execute();
    },

    // Sign-out: only her own token; someone else's is indistinguishable from a missing one.
    async revoke(userId: UserId, expoToken: string): Promise<boolean> {
      const res = await db
        .updateTable('pushTokens')
        .set({ revokedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('expoToken', '=', expoToken)
        .where('revokedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    active(userId: UserId) {
      return db
        .selectFrom('pushTokens')
        .select(['expoToken', 'platform', 'lastSeenAt'])
        .where('userId', '=', userId)
        .where('revokedAt', 'is', null)
        .orderBy('lastSeenAt', 'desc')
        .execute();
    },
  };
}

// Worker side (notifyFn): active tokens for a page of recipients, and revocation of tokens Expo
// reports as DeviceNotRegistered.
export function pushDeliveryRepo(db: Db) {
  return {
    activeFor(userIds: readonly string[]) {
      if (userIds.length === 0) return Promise.resolve([]);
      return db
        .selectFrom('pushTokens')
        .select(['userId', 'expoToken'])
        .where('userId', 'in', [...userIds])
        .where('revokedAt', 'is', null)
        .execute();
    },

    async revokeTokens(expoTokens: readonly string[]): Promise<void> {
      if (expoTokens.length === 0) return;
      await db
        .updateTable('pushTokens')
        .set({ revokedAt: sql`now()` })
        .where('expoToken', 'in', [...expoTokens])
        .where('revokedAt', 'is', null)
        .execute();
    },
  };
}
