import { dailyBudgetMicros } from '@robes/core';
import { sql } from 'kysely';
import type { Db } from '../client';

export interface CallRecord {
  jobId?: string | undefined;
  userId?: string | undefined;
  feature: string;
  model: string;
  family: string;
  tokensIn: number;
  tokensOut: number;
  images: number;
  latencyMs: number;
  status: 'ok' | 'partial' | 'timeout' | 'error' | 'cancelled';
  costMicros: number;
  // Stored for 30 days only (SEC-82) and never logged.
  prompt?: string | undefined;
  response?: unknown;
}

// The budget day is the UTC calendar day, computed by the database for both write and read.
const utcToday = sql<Date>`(now() at time zone 'utc')::date`;

// Model-call ledger + global spend breaker; written by workers, read by the API before paid work.
export function ledgerRepo(db: Db) {
  return {
    async record(call: CallRecord): Promise<void> {
      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto('generationCalls')
          .values({
            jobId: call.jobId ?? null,
            userId: call.userId ?? null,
            feature: call.feature,
            model: call.model,
            tokensIn: call.tokensIn,
            tokensOut: call.tokensOut,
            images: call.images,
            latencyMs: call.latencyMs,
            status: call.status,
            costMicros: call.costMicros,
            prompt: call.prompt ?? null,
            response: call.response === undefined ? null : JSON.stringify(call.response),
          })
          .execute();
        if (call.costMicros > 0) {
          await trx
            .insertInto('platformBudget')
            .values({
              day: utcToday,
              modelFamily: call.family,
              costMicros: call.costMicros,
              limitMicros: dailyBudgetMicros(call.family),
            })
            .onConflict((oc) =>
              oc.columns(['day', 'modelFamily']).doUpdateSet({
                costMicros: sql`platform_budget.cost_micros + excluded.cost_micros`,
              }),
            )
            .execute();
        }
        if (call.jobId && call.costMicros > 0) {
          await trx
            .updateTable('generationJobs')
            .set({ costMicros: sql`cost_micros + ${call.costMicros}` })
            .where('id', '=', call.jobId)
            .execute();
        }
      });
    },

    // True when any of the families has spent its daily limit (SEC-03).
    async isExhausted(families: readonly string[]): Promise<boolean> {
      if (families.length === 0) return false;
      const rows = await db
        .selectFrom('platformBudget')
        .select(['costMicros', 'limitMicros'])
        .where('day', '=', utcToday)
        .where('modelFamily', 'in', [...families])
        .execute();
      return rows.some((r) => BigInt(r.costMicros) >= BigInt(r.limitMicros));
    },
  };
}
