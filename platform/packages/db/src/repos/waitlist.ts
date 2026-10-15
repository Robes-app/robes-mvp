import { sql } from 'kysely';
import type { Db } from '../client';

// SEC-60: Postgres-first waitlist. An unauthenticated caller can only ever add a new address;
// nothing about an existing contact is changed or revealed.
export function waitlistRepo(db: Db) {
  return {
    // The new row's id, or undefined when the address is already on the list.
    async join(entry: {
      email: string;
      name?: string | undefined;
      instagramHandle?: string | undefined;
      source?: string | undefined;
      utm?: Record<string, string> | undefined;
    }): Promise<string | undefined> {
      const row = await db
        .insertInto('waitlist')
        .values({
          email: entry.email,
          name: entry.name ?? null,
          instagramHandle: entry.instagramHandle ?? null,
          source: entry.source ?? null,
          utm: JSON.stringify(entry.utm ?? {}),
        })
        .onConflict((oc) => oc.column('email').doNothing())
        .returning('id')
        .executeTakeFirst();
      return row?.id;
    },

    // Double opt-in: the signed link confirms once; true if this call confirmed it.
    async confirm(id: string): Promise<boolean> {
      const res = await db
        .updateTable('waitlist')
        .set({ confirmedAt: sql`now()` })
        .where('id', '=', id)
        .where('confirmedAt', 'is', null)
        .where('unsubscribedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    get(id: string) {
      return db
        .selectFrom('waitlist')
        .select(['id', 'email', 'confirmedAt', 'unsubscribedAt'])
        .where('id', '=', id)
        .executeTakeFirst();
    },
  };
}
