import type { JobKind, JobStage } from '@robes/core';
import { type SystemRepositories, type UserId, verifiedUserId } from '@robes/db';
import type { JobLogger } from './logger';
import { errorName } from './transport';

// Must outlast the longest worker timeout (generate: 5 min) so a live run is never re-claimed.
export const LEASE_SECONDS = 330;
export const MAX_BUDGET_MS = 280_000;
export const MAX_ATTEMPTS = 3;

// Thrown by handlers for known failures; `code` is stored on the job, never provider text.
export class JobError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'JobError';
  }
}

export class JobCancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'JobCancelled';
  }
}

export interface JobContext {
  jobId: string;
  // The job row's owner: handlers load all context from the DB with it (SEC-16).
  userId: UserId;
  input: Record<string, unknown>;
  // Aborts on cancellation or when the per-kind time budget runs out (SEC-05).
  signal: AbortSignal;
  writeStage(
    stage: Exclude<JobStage, 'queued' | 'done'>,
    output: Record<string, unknown>,
  ): Promise<void>;
  isCancelled(): Promise<boolean>;
}

export interface JobResult {
  status?: 'succeeded' | 'partial';
  artifactId?: string;
}

export interface JobHandler {
  budgetMs: number;
  run(ctx: JobContext): Promise<JobResult>;
}

export type JobHandlers = Partial<Record<JobKind, JobHandler>>;

export type RunOutcome = 'skipped' | 'succeeded' | 'partial' | 'failed' | 'cancelled';

export interface RunJobDeps {
  jobs: Pick<SystemRepositories['jobs'], 'claim' | 'writeStage' | 'finish' | 'isCancelRequested'>;
  handlers: JobHandlers;
  logger: JobLogger;
  cancelPollMs?: number;
}

const ERROR_CODE = /^[a-z][a-z_]{0,39}$/;

function errorCode(err: unknown): string {
  return err instanceof JobError && ERROR_CODE.test(err.code) ? err.code : 'internal';
}

// Claim → handler → finish. Throws only when the DB is unreachable, so the message is retried.
export async function runJob(jobId: string, deps: RunJobDeps): Promise<RunOutcome> {
  const { jobs, logger } = deps;
  const claimed = await jobs.claim(jobId, LEASE_SECONDS);
  // Duplicate delivery, a live lease elsewhere, or already finished/cancelled.
  if (!claimed) return 'skipped';

  const kind = claimed.kind as JobKind;
  const finish = async (
    status: Exclude<RunOutcome, 'skipped'>,
    extra: { error?: string; artifactId?: string } = {},
  ): Promise<RunOutcome> => {
    await jobs.finish(jobId, { status, ...extra });
    logger.info({ jobId, kind, status, error: extra.error }, 'job_finished');
    return status;
  };

  if (claimed.attempts > MAX_ATTEMPTS) return finish('failed', { error: 'attempts_exhausted' });
  const handler = deps.handlers[kind];
  if (!handler) return finish('failed', { error: 'unsupported_kind' });

  const cancel = new AbortController();
  const budget = AbortSignal.timeout(Math.min(handler.budgetMs, MAX_BUDGET_MS));
  const signal = AbortSignal.any([cancel.signal, budget]);
  const isCancelled = async (): Promise<boolean> => {
    if (!cancel.signal.aborted && (await jobs.isCancelRequested(jobId))) {
      cancel.abort(new JobCancelled());
    }
    return cancel.signal.aborted;
  };
  const poll = setInterval(() => isCancelled().catch(() => {}), deps.cancelPollMs ?? 1000);

  try {
    const result = await handler.run({
      jobId,
      userId: verifiedUserId(claimed.userId),
      input: claimed.input as Record<string, unknown>,
      signal,
      isCancelled,
      async writeStage(stage, output) {
        signal.throwIfAborted();
        await jobs.writeStage(jobId, stage, output);
      },
    });
    return await finish(result.status ?? 'succeeded', {
      ...(result.artifactId ? { artifactId: result.artifactId } : {}),
    });
  } catch (err) {
    if (cancel.signal.aborted || err instanceof JobCancelled) return finish('cancelled');
    if (budget.aborted) return finish('failed', { error: 'timeout' });
    logger.error({ jobId, kind, err: errorName(err) }, 'job_handler_failed');
    return finish('failed', { error: errorCode(err) });
  } finally {
    clearInterval(poll);
  }
}
