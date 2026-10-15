import type { JobKind, JobStage, UsageMetric } from '@robes/core';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';
import { usageRepo } from './usage';

export interface QuotaCost {
  metric: UsageMetric;
  cost: number;
}

export interface CreateJobInput {
  kind: JobKind;
  input: Record<string, unknown>;
  idempotencyKey?: string | undefined;
  // Every entry is consumed in the job's transaction, so one over-limit metric spends none.
  quota?: QuotaCost | QuotaCost[] | undefined;
  priority?: number;
  traceId?: string;
  // At most one queued or running job of this kind per person: a second start returns it.
  singleFlight?: boolean;
}

const JOB_COLUMNS = [
  'id',
  'userId',
  'kind',
  'status',
  'stage',
  'input',
  'output',
  'error',
  'artifactId',
  'createdAt',
  'startedAt',
  'finishedAt',
  'updatedAt',
  'cancelRequestedAt',
] as const;

export function jobsRepo(db: Db) {
  const usage = usageRepo(db);

  return {
    // Quota + insert commit together; a replayed idempotency key returns the original job.
    async create(userId: UserId, job: CreateJobInput) {
      return db.transaction().execute(async (trx) => {
        if (job.idempotencyKey) {
          const existing = await trx
            .selectFrom('generationJobs')
            .select(JOB_COLUMNS)
            .where('userId', '=', userId)
            .where('idempotencyKey', '=', job.idempotencyKey)
            .executeTakeFirst();
          if (existing) return { job: existing, replayed: true };
        }
        if (job.singleFlight) {
          // Serialises her starts, so two at once can't both miss the one in flight.
          await trx.selectFrom('users').select('id').where('id', '=', userId).forUpdate().execute();
          const inFlight = await trx
            .selectFrom('generationJobs')
            .select(JOB_COLUMNS)
            .where('userId', '=', userId)
            .where('kind', '=', job.kind)
            .where('status', 'in', ['queued', 'running'])
            .orderBy('createdAt', 'desc')
            .limit(1)
            .executeTakeFirst();
          if (inFlight) return { job: inFlight, replayed: true };
        }
        for (const q of [job.quota ?? []].flat()) {
          await usage.consume(userId, q.metric, q.cost, { executor: trx });
        }
        const created = await trx
          .insertInto('generationJobs')
          .values({
            userId,
            kind: job.kind,
            input: JSON.stringify(job.input),
            idempotencyKey: job.idempotencyKey ?? null,
            priority: job.priority ?? 0,
            traceId: job.traceId ?? null,
          })
          .returning(JOB_COLUMNS)
          .executeTakeFirstOrThrow();
        return { job: created, replayed: false };
      });
    },

    // Today's generation tray: her running jobs plus ones that finished in the last 15 minutes.
    recent(userId: UserId, kinds: readonly JobKind[], limit = 5) {
      return (
        db
          .selectFrom('generationJobs')
          .select(JOB_COLUMNS)
          .where('userId', '=', userId)
          .where('kind', 'in', [...kinds])
          // Overnight looks wait hours in their batch; Today shows them as a card, not the tray.
          .where(sql<boolean>`coalesce(input->>'overnight', 'false') <> 'true'`)
          .where((eb) =>
            eb.or([
              eb('status', 'in', ['queued', 'running']),
              eb('finishedAt', '>', sql<Date>`now() - interval '15 minutes'`),
            ]),
          )
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .execute()
      );
    },

    // Her newest job of one kind, whatever its state (a start's in-flight and back-off checks).
    latest(userId: UserId, kind: JobKind) {
      return db
        .selectFrom('generationJobs')
        .select(JOB_COLUMNS)
        .where('userId', '=', userId)
        .where('kind', '=', kind)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .executeTakeFirst();
    },

    getForUser(userId: UserId, jobId: string) {
      return db
        .selectFrom('generationJobs')
        .select(JOB_COLUMNS)
        .where('id', '=', jobId)
        .where('userId', '=', userId)
        .executeTakeFirst();
    },

    // A queued job is cancelled outright; a running one is flagged and its worker stops.
    async requestCancel(userId: UserId, jobId: string): Promise<boolean> {
      const queued = sql<boolean>`status = 'queued'`;
      const res = await db
        .updateTable('generationJobs')
        .set({
          cancelRequestedAt: sql`coalesce(cancel_requested_at, now())`,
          status: sql`case when ${queued} then 'cancelled' else status end`,
          stage: sql`case when ${queued} then 'done' else stage end`,
          finishedAt: sql`case when ${queued} then now() else finished_at end`,
        })
        .where('id', '=', jobId)
        .where('userId', '=', userId)
        .where('status', 'in', ['queued', 'running'])
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },
  };
}

// Worker-side operations: jobs are addressed by id; the row's own user_id scopes any follow-up reads.
export function jobRunnerRepo(db: Db) {
  return {
    // Lease-based claim: duplicate deliveries and crashed workers are both safe.
    claim(jobId: string, leaseSeconds: number) {
      return db
        .updateTable('generationJobs')
        .set({
          status: 'running',
          attempts: sql`attempts + 1`,
          leaseUntil: sql`now() + make_interval(secs => ${leaseSeconds})`,
          startedAt: sql`coalesce(started_at, now())`,
        })
        .where('id', '=', jobId)
        .where('cancelRequestedAt', 'is', null)
        .where((eb) =>
          eb.or([
            eb('status', '=', 'queued'),
            eb.and([eb('status', '=', 'running'), eb('leaseUntil', '<', sql<Date>`now()`)]),
          ]),
        )
        .returning(['id', 'userId', 'kind', 'input', 'output', 'attempts'])
        .executeTakeFirst();
    },

    // The isolated link fetcher's result (SEC-40), attached to a still-queued link_import job
    // before it runs. False when the job isn't a queued link import (dropped, never retried).
    async attachFetched(jobId: string, fetched: Record<string, unknown>): Promise<boolean> {
      const res = await db
        .updateTable('generationJobs')
        .set({
          input: sql`input || jsonb_build_object('fetched', ${JSON.stringify(fetched)}::jsonb)`,
        })
        .where('id', '=', jobId)
        .where('kind', '=', 'link_import')
        .where('status', '=', 'queued')
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    // Merges a stage's output into the job; the row is the durable truth clients resume from.
    async writeStage(
      jobId: string,
      stage: JobStage,
      output: Record<string, unknown>,
    ): Promise<void> {
      await db
        .updateTable('generationJobs')
        .set({ stage, output: sql`output || ${JSON.stringify(output)}::jsonb` })
        .where('id', '=', jobId)
        .where('status', '=', 'running')
        .execute();
    },

    async finish(
      jobId: string,
      result: {
        status: 'succeeded' | 'partial' | 'failed' | 'cancelled';
        error?: string;
        artifactId?: string;
      },
    ): Promise<void> {
      await db
        .updateTable('generationJobs')
        .set({
          status: result.status,
          stage: 'done',
          error: result.error ?? null,
          artifactId: result.artifactId ?? null,
          finishedAt: sql`now()`,
          leaseUntil: null,
        })
        .where('id', '=', jobId)
        .where('status', '=', 'running')
        .execute();
    },

    async isCancelRequested(jobId: string): Promise<boolean> {
      const row = await db
        .selectFrom('generationJobs')
        .select('cancelRequestedAt')
        .where('id', '=', jobId)
        .executeTakeFirst();
      return row?.cancelRequestedAt != null;
    },

    // Outbox recovery (infrastructure.md §4.2): queued jobs the transport never delivered, and
    // running jobs whose worker died (lease expired).
    async stale(olderThanSeconds: number, limit: number): Promise<string[]> {
      const rows = await db
        .selectFrom('generationJobs')
        .select('id')
        .where((eb) =>
          eb.or([
            eb.and([
              eb('status', '=', 'queued'),
              eb('createdAt', '<', sql<Date>`now() - make_interval(secs => ${olderThanSeconds})`),
            ]),
            eb.and([eb('status', '=', 'running'), eb('leaseUntil', '<', sql<Date>`now()`)]),
          ]),
        )
        .orderBy('createdAt')
        .limit(limit)
        .execute();
      return rows.map((r) => r.id);
    },
  };
}
