import { DEFAULT_PLAN, PLAN_LIMITS, type PlanId, type UsageMetric } from '@robes/core';
import { sql, type Transaction } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import { QuotaExceeded } from '../errors';
import type { UserId } from '../ids';

type Executor = Db | Transaction<DB>;

async function planFor(db: Executor, userId: UserId): Promise<PlanId> {
  const row = await db
    .selectFrom('entitlements')
    .select('planId')
    .where('userId', '=', userId)
    .where('status', 'in', ['active', 'trialing', 'past_due'])
    .executeTakeFirst();
  return (row?.planId as PlanId | undefined) ?? DEFAULT_PLAN;
}

function periodBounds(period: 'day' | 'month', now: Date): { start: string; resetAt: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = period === 'day' ? new Date(Date.UTC(y, m, d)) : new Date(Date.UTC(y, m, 1));
  const resetAt =
    period === 'day' ? new Date(Date.UTC(y, m, d + 1)) : new Date(Date.UTC(y, m + 1, 1));
  return { start: start.toISOString().slice(0, 10), resetAt };
}

export function usageRepo(db: Db) {
  return {
    // Atomic check-and-increment (SEC-02); pass the job-creating transaction so both commit together.
    async consume(
      userId: UserId,
      metric: UsageMetric,
      cost: number,
      opts: { executor?: Executor; now?: Date } = {},
    ): Promise<void> {
      const executor = opts.executor ?? db;
      const limit = PLAN_LIMITS[await planFor(executor, userId)][metric];
      const { start, resetAt } = periodBounds(limit.period, opts.now ?? new Date());
      if (cost > limit.limit) throw new QuotaExceeded(resetAt);
      const row = await executor
        .insertInto('usageCounters')
        .values({ userId, metric, periodStart: start, count: cost })
        .onConflict((oc) =>
          oc
            .columns(['userId', 'metric', 'periodStart'])
            .doUpdateSet({ count: sql`usage_counters.count + excluded.count` })
            .where(sql<boolean>`usage_counters.count + excluded.count <= ${limit.limit}`),
        )
        .returning('count')
        .executeTakeFirst();
      if (!row) throw new QuotaExceeded(resetAt);
    },
  };
}
