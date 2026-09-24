import 'server-only';
import { createSystemRepositories } from '@robes/db';
import { createHandlers, createJobAi, createWeather, type RunOutcome, runJob } from '@robes/jobs';
import { db } from './db';
import { env } from './env';
import { logger } from './logger';
import { mediaStorage } from './media';

// Dev-only worker pipeline inside the web process (see jobs.ts); never reachable from a route.
const system = createSystemRepositories(db);
const ai = createJobAi({ appEnv: env.APP_ENV, geminiApiKey: env.GEMINI_API_KEY });
const renderLocally = async (key: string) => (await import('./local-rendition')).renderLocally(key);
const handlers = createHandlers({
  wardrobeAnalyse: { ai, storage: mediaStorage, pieces: system.pieces, ledger: system.ledger },
  styleAnalyse: {
    ai,
    storage: mediaStorage,
    profiles: system.styleAnalysis,
    ledger: system.ledger,
  },
  stylePiece: {
    ai,
    storage: mediaStorage,
    styling: system.styling,
    ledger: system.ledger,
    // Stand-in for the S3 event → RenditionFn, as for uploads.
    onGenerated: renderLocally,
  },
  daily: {
    ai,
    storage: mediaStorage,
    styling: system.styling,
    ledger: system.ledger,
    weather: createWeather(),
    onGenerated: renderLocally,
  },
});

export function runInline(jobId: string): Promise<RunOutcome> {
  return runJob(jobId, { jobs: system.jobs, handlers, logger });
}
