import 'server-only';
import { ApiError, isUuid } from '@robes/api';
import { JobSnapshot, JobStatus, type StartJobOutput } from '@robes/contracts';
import { type CreateJobInput, QuotaExceeded, type UserId } from '@robes/db';
import {
  consoleJobLogger,
  createInlineTransport,
  createSqsTransport,
  enqueueJob,
  type JobTransport,
} from '@robes/jobs';
import { after } from 'next/server';
import { repos } from './db';
import { env } from './env';

// SQS when configured; otherwise run in this process after the response (dev, or staging with
// JOBS_TRANSPORT_INLINE). The inline runner is loaded lazily so deployed builds never touch it.
const transport: JobTransport = env.JOBS_INTERACTIVE_QUEUE_URL
  ? createSqsTransport({ queueUrl: env.JOBS_INTERACTIVE_QUEUE_URL })
  : createInlineTransport({
      run: async (jobId) => (await import('./inline-worker')).runInline(jobId),
      schedule: after,
      logger: consoleJobLogger,
    });

export async function startJob(
  userId: UserId,
  req: Request,
  job: Omit<CreateJobInput, 'idempotencyKey' | 'traceId'>,
): Promise<StartJobOutput> {
  const idempotencyKey = req.headers.get('idempotency-key') ?? undefined;
  if (idempotencyKey !== undefined && !isUuid(idempotencyKey)) {
    throw new ApiError('invalid_input', {
      details: [{ path: 'Idempotency-Key', message: 'must be a UUID' }],
    });
  }
  const traceparent = req.headers.get('traceparent') ?? undefined;
  let created: Awaited<ReturnType<typeof repos.jobs.create>>;
  try {
    created = await repos.jobs.create(userId, {
      ...job,
      idempotencyKey,
      ...(traceparent ? { traceId: traceparent } : {}),
    });
  } catch (err) {
    if (err instanceof QuotaExceeded) {
      throw new ApiError('quota_exceeded', { details: { resetAt: err.resetAt.toISOString() } });
    }
    throw err;
  }
  const { id, status } = created.job;
  // A replay re-sends a still-queued job; the worker's claim makes duplicates harmless.
  if (status === 'queued')
    await enqueueJob(transport, { jobId: id, traceparent }, consoleJobLogger);
  return { jobId: id, status: JobStatus.parse(status) };
}

type JobRow = NonNullable<Awaited<ReturnType<typeof repos.jobs.getForUser>>>;

// Rows never leave the server as-is (CLAUDE.md rule 8): parse through the contract.
export function toJobSnapshot(row: JobRow): JobSnapshot {
  return JobSnapshot.parse({
    id: row.id,
    kind: row.kind,
    status: row.status,
    stage: row.stage,
    output: row.output,
    error: row.error,
    cancelRequested: row.cancelRequestedAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  });
}

export async function loadJobSnapshot(
  userId: UserId,
  jobId: string,
): Promise<JobSnapshot | undefined> {
  const row = await repos.jobs.getForUser(userId, jobId);
  return row ? toJobSnapshot(row) : undefined;
}
