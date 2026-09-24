import 'server-only';
import { createSystemRepositories } from '@robes/db';
import { createHandlers, createJobAi, type RunOutcome, runJob } from '@robes/jobs';
import { db } from './db';
import { env } from './env';
import { logger } from './logger';
import { mediaStorage } from './media';

// Dev-only worker pipeline inside the web process (see jobs.ts); never reachable from a route.
const system = createSystemRepositories(db);
const ai = createJobAi({ appEnv: env.APP_ENV, geminiApiKey: env.GEMINI_API_KEY });
const handlers = createHandlers({
  wardrobeAnalyse: { ai, storage: mediaStorage, pieces: system.pieces, ledger: system.ledger },
  stylePiece: {
    ai,
    storage: mediaStorage,
    styling: system.styling,
    ledger: system.ledger,
    // Stand-in for the S3 event → RenditionFn, as for uploads.
    onGenerated: async (key) => (await import('./local-rendition')).renderLocally(key),
  },
});

export function runInline(jobId: string): Promise<RunOutcome> {
  return runJob(jobId, { jobs: system.jobs, handlers, logger });
}
