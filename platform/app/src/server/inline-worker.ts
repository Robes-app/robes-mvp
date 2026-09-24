import 'server-only';
import { createSystemRepositories } from '@robes/db';
import { createHandlers, type RunOutcome, runJob } from '@robes/jobs';
import { db } from './db';
import { logger } from './logger';

// Dev-only worker pipeline inside the web process (see jobs.ts); never reachable from a route.
const system = createSystemRepositories(db);
const handlers = createHandlers();

export function runInline(jobId: string): Promise<RunOutcome> {
  return runJob(jobId, { jobs: system.jobs, handlers, logger: logger });
}
