import type { UsageMetric } from '@robes/core';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';
import { usageRepo } from './usage';

export const JOB_KINDS = [
  'fake',
  'key_piece',
  'daily',
  'travel',
  'travel_looks',
  'look_render',
  'avatar_cell',
  'wardrobe_analyse',
  'stylenotes_analyse',
  'receipt_read',
  'alternates',
  'lookbuild_note',
  'link_import',
  'cutout',
] as const;
export type JobKind = (typeof JOB_KINDS)[number];
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled';
export type JobStage = 'queued' | 'text' | 'images' | 'done';

export interface CreateJobInput {
  kind: JobKind;
  input: Record<string, unknown>;
  idempotencyKey?: string | undefined;
  quota?: { metric: UsageMetric; cost: number } | undefined;
  priority?: number;
  traceId?: string;
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
        if (job.quota) {
          await usage.consume(userId, job.quota.metric, job.quota.cost, { executor: trx });
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

    getForUser(userId: UserId, jobId: string) {
      return db
        .selectFrom('generationJobs')
        .select(JOB_COLUMNS)
        .where('id', '=', jobId)
        .where('userId', '=', userId)
        .executeTakeFirst();
    },

    async requestCancel(userId: UserId, jobId: string): Promise<boolean> {
      const res = await db
        .updateTable('generationJobs')
        .set({ cancelRequestedAt: sql`coalesce(cancel_requested_at, now())` })
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

    // Outbox recovery: queued jobs the transport never delivered (infrastructure.md §4.2).
    async staleQueued(olderThanSeconds: number, limit: number): Promise<string[]> {
      const rows = await db
        .selectFrom('generationJobs')
        .select('id')
        .where('status', '=', 'queued')
        .where('createdAt', '<', sql<Date>`now() - make_interval(secs => ${olderThanSeconds})`)
        .orderBy('createdAt')
        .limit(limit)
        .execute();
      return rows.map((r) => r.id);
    },
  };
}
