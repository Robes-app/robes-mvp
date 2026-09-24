import 'server-only';
import { createSystemRepositories } from '@robes/db';
import { createHandlers, createJobAi, type RunOutcome, runJob } from '@robes/jobs';
import { db } from './db';
import { env } from './env';
import { logger } from './logger';
import { mediaStorage } from './media';

// Dev-only worker pipeline inside the web process (see jobs.ts); never reachable from a route.
const system = createSystemRepositories(db);
const handlers = createHandlers({
  wardrobeAnalyse: {
    ai: createJobAi({ appEnv: env.APP_ENV, geminiApiKey: env.GEMINI_API_KEY }),
    storage: mediaStorage,
    pieces: system.pieces,
    ledger: system.ledger,
  },
});

export function runInline(jobId: string): Promise<RunOutcome> {
  return runJob(jobId, { jobs: system.jobs, handlers, logger });
}
