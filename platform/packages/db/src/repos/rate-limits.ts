import { sql } from 'kysely';
import type { Db } from '../client';

// Fixed-window counters for the API rate limiter; one atomic upsert per request.
export function rateLimitRepo(db: Db) {
  return {
    async hit(key: string, windowSeconds: number): Promise<{ count: number; resetAt: Date }> {
      const start = sql<Date>`to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds})`;
      const row = await db
        .insertInto('rateLimitCounters')
        .values({
          key,
          windowStart: start,
          count: 1,
          expiresAt: sql<Date>`${start} + make_interval(secs => ${windowSeconds})`,
        })
        .onConflict((oc) =>
          oc
            .columns(['key', 'windowStart'])
            .doUpdateSet({ count: sql`rate_limit_counters.count + 1` }),
        )
        .returning(['count', 'expiresAt'])
        .executeTakeFirstOrThrow();
      return { count: row.count, resetAt: row.expiresAt };
    },

    // Called by maintenance; windows are short, so expired rows are pure garbage.
    async purgeExpired(): Promise<number> {
      const res = await db
        .deleteFrom('rateLimitCounters')
        .where('expiresAt', '<', sql<Date>`now()`)
        .executeTakeFirst();
      return Number(res.numDeletedRows);
    },
  };
}
