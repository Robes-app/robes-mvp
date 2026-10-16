import type { SystemRepositories } from '@robes/db';
import type { JobLogger } from './logger';
import type { JobMessage } from './message';
import { errorName, type JobTransport } from './transport';

// Never fails the request: an undelivered job stays queued and the sweeper re-sends it.
export async function enqueueJob(
  transport: JobTransport,
  message: JobMessage,
  logger: JobLogger,
): Promise<boolean> {
  try {
    await transport.send(message);
    return true;
  } catch (err) {
    logger.warn({ jobId: message.jobId, err: errorName(err) }, 'job_enqueue_failed');
    return false;
  }
}

export const SWEEP_AFTER_SECONDS = 60;

export async function sweep(deps: {
  jobs: Pick<SystemRepositories['jobs'], 'stale'>;
  transport: JobTransport;
  logger: JobLogger;
  olderThanSeconds?: number;
  limit?: number;
}): Promise<{ found: number; enqueued: number }> {
  const ids = await deps.jobs.stale(
    deps.olderThanSeconds ?? SWEEP_AFTER_SECONDS,
    deps.limit ?? 100,
  );
  let enqueued = 0;
  for (const jobId of ids) {
    if (await enqueueJob(deps.transport, { jobId }, deps.logger)) enqueued += 1;
  }
  if (ids.length > 0) deps.logger.info({ found: ids.length, enqueued }, 'job_sweep');
  return { found: ids.length, enqueued };
}
