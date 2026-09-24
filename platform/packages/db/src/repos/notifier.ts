import { sql } from 'kysely';
import type { Db } from '../client';

// Worker side of the email sequence (notifyFn). Set-based: one query per concern per page of
// recipients, never one per person.
export function notifierRepo(db: Db) {
  return {
    // Onboarded people with an unsuppressed address, in id order for keyset paging.
    recipients(opts: { afterId?: string | undefined; limit: number }) {
      let q = db
        .selectFrom('users as u')
        .innerJoin('profiles as p', 'p.id', 'u.id')
        .leftJoin('emailSuppressions as s', (j) =>
          j.on(sql<boolean>`s.email = u.email::extensions.citext`),
        )
        .select(['u.id', 'u.email', 'p.timezone', 'p.notificationPrefs', 'u.createdAt'])
        .where('p.onboardedAt', 'is not', null)
        .where('s.email', 'is', null)
        .orderBy('u.id')
        .limit(opts.limit);
      if (opts.afterId) q = q.where('u.id', '>', opts.afterId);
      return q.execute();
    },

    async state(userIds: readonly string[], plan: { from: string; to: string }) {
      if (userIds.length === 0) {
        return { ledger: [], ideas: [], pieces: [], looks: [], plan: [], overnight: [] };
      }
      const ids = [...userIds];
      const [ledger, ideas, pieces, looks, planRows, overnight] = await Promise.all([
        db
          .selectFrom('notifications')
          .select(['userId', 'kind', 'ref', 'sentAt'])
          .where('userId', 'in', ids)
          .where('sentAt', '>', sql<Date>`now() - interval '30 days'`)
          .execute(),
        db
          .selectFrom('artifacts')
          .distinctOn('userId')
          .select([
            'userId',
            'id',
            'title',
            'createdAt',
            sql<number>`(select count(*)::int from jsonb_array_elements(coalesce(data->'images', '[]'::jsonb)) f where f->>'status' = 'ready')`.as(
              'readyFrames',
            ),
          ])
          .where('userId', 'in', ids)
          .where('type', '=', 'idea')
          .where('deletedAt', 'is', null)
          .where('createdAt', '>', sql<Date>`now() - interval '48 hours'`)
          .orderBy('userId')
          .orderBy('createdAt', 'desc')
          .execute(),
        db
          .selectFrom('wardrobeItems')
          .select([
            'userId',
            sql<number>`count(*)::int`.as('ready'),
            sql<Date | null>`(array_agg(created_at order by created_at))[5]`.as('fifthAt'),
          ])
          .where('userId', 'in', ids)
          .where('status', '=', 'ready')
          .where('deletedAt', 'is', null)
          .groupBy('userId')
          .execute(),
        db
          .selectFrom('looks')
          .select(['userId', sql<number>`count(*)::int`.as('n')])
          .where('userId', 'in', ids)
          .where('deletedAt', 'is', null)
          .groupBy('userId')
          .execute(),
        db
          .selectFrom('plannedDays as d')
          .innerJoin('looks as l', (j) =>
            j.onRef('l.id', '=', 'd.lookId').onRef('l.userId', '=', 'd.userId'),
          )
          .select([
            'd.userId',
            sql<string>`d.day_date::text`.as('date'),
            'l.name as lookName',
            'd.activity',
            'd.slot',
          ])
          .where('d.userId', 'in', ids)
          .where('d.deletedAt', 'is', null)
          .where('l.deletedAt', 'is', null)
          .where('d.dayDate', '>=', sql<Date>`${plan.from}::date`)
          .where('d.dayDate', '<=', sql<Date>`${plan.to}::date`)
          .execute(),
        // Overnight Today looks (M5 task 3) in the same date window, for the morning cue.
        db
          .selectFrom('artifacts')
          .select(['userId', 'id', sql<string>`data->>'date'`.as('date'), 'subtitle as headline'])
          .where('userId', 'in', ids)
          .where('type', '=', 'daily_look')
          .where('deletedAt', 'is', null)
          .where(sql<boolean>`data->>'overnight' = 'true'`)
          .where(sql<boolean>`data->>'date' between ${plan.from} and ${plan.to}`)
          .execute(),
      ]);
      return { ledger, ideas, pieces, looks, plan: planRows, overnight };
    },

    // One person's address and prefs for a transactional mail; nothing when she can't be mailed.
    recipient(userId: string) {
      return db
        .selectFrom('users as u')
        .innerJoin('profiles as p', 'p.id', 'u.id')
        .leftJoin('emailSuppressions as s', (j) =>
          j.on(sql<boolean>`s.email = u.email::extensions.citext`),
        )
        .select(['u.id', 'u.email', 'p.notificationPrefs'])
        .where('u.id', '=', userId)
        .where('s.email', 'is', null)
        .executeTakeFirst();
    },

    // The ledger is written before sending, so a re-run or a second worker can never mail twice.
    async claim(
      userId: string,
      kind: string,
      ref: string,
      channel: 'email' | 'push' = 'email',
    ): Promise<boolean> {
      const row = await db
        .insertInto('notifications')
        .values({ userId, kind, ref, channel })
        .onConflict((oc) => oc.columns(['userId', 'kind', 'ref', 'channel']).doNothing())
        .returning('id')
        .executeTakeFirst();
      return row !== undefined;
    },

    // The transport failed: give the claim back so the next tick retries.
    async release(
      userId: string,
      kind: string,
      ref: string,
      channel: 'email' | 'push' = 'email',
    ): Promise<void> {
      await db
        .deleteFrom('notifications')
        .where('userId', '=', userId)
        .where('kind', '=', kind)
        .where('ref', '=', ref)
        .where('channel', '=', channel)
        .execute();
    },
  };
}
