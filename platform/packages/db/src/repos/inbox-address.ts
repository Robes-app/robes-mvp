import { randomBytes } from 'node:crypto';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// 20 characters from 36 (~103 bits), minted here only; the address is the capability to put mail
// in her Inbox, so it must be unguessable (SEC-13 spirit).
export function mintInboxAddress(): string {
  return [...randomBytes(20)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

// Her forwarding address (one per person; regenerating replaces it, so the old one stops working).
export function inboxAddressRepo(db: Db) {
  const current = (userId: UserId) =>
    db
      .selectFrom('inboxAddresses')
      .select(['address', 'createdAt'])
      .where('userId', '=', userId)
      .where('revokedAt', 'is', null)
      .executeTakeFirst();

  return {
    current,

    // The active address, minted on first use.
    async ensure(userId: UserId) {
      const found = await current(userId);
      if (found) return found;
      return db
        .insertInto('inboxAddresses')
        .values({ userId, address: mintInboxAddress() })
        .onConflict((oc) =>
          oc.column('userId').doUpdateSet({
            address: sql`excluded.address`,
            revokedAt: null,
            createdAt: sql`now()`,
          }),
        )
        .returning(['address', 'createdAt'])
        .executeTakeFirstOrThrow();
    },

    regenerate(userId: UserId) {
      return db
        .insertInto('inboxAddresses')
        .values({ userId, address: mintInboxAddress() })
        .onConflict((oc) =>
          oc.column('userId').doUpdateSet({
            address: sql`excluded.address`,
            revokedAt: null,
            createdAt: sql`now()`,
          }),
        )
        .returning(['address', 'createdAt'])
        .executeTakeFirstOrThrow();
    },

    async revoke(userId: UserId): Promise<boolean> {
      const res = await db
        .updateTable('inboxAddresses')
        .set({ revokedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('revokedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },
  };
}
