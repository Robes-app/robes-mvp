import 'server-only';
import { createSystemRepositories } from '@robes/db';
import {
  createHandlers,
  createJobAi,
  createTripWeather,
  createWeather,
  fetchLink,
  type RunOutcome,
  runJob,
} from '@robes/jobs';
import { db } from './db';
import { env } from './env';
import { logger } from './logger';
import { mediaStorage } from './media';

// Dev-only worker pipeline inside the web process (see jobs.ts); never reachable from a route.
const system = createSystemRepositories(db);
const ai = createJobAi({ appEnv: env.APP_ENV, geminiApiKey: env.GEMINI_API_KEY });
const renderLocally = async (key: string) => (await import('./local-rendition')).renderLocally(key);
const handlers = createHandlers({
  // Same SSRF guard as the isolated fetcher; ALLOW_PRIVATE_FETCH (dev only) lets e2e use a local page.
  linkImport: {
    intake: system.inboxIntake,
    fetchLink: (url) => fetchLink(url, { allowPrivate: env.ALLOW_PRIVATE_FETCH !== undefined }),
  },
  wardrobeAnalyse: { ai, storage: mediaStorage, pieces: system.pieces, ledger: system.ledger },
  styleAnalyse: {
    ai,
    storage: mediaStorage,
    profiles: system.styleAnalysis,
    ledger: system.ledger,
  },
  styleBrief: { ai, brief: system.styleBrief, styling: system.styling, ledger: system.ledger },
  stylePiece: {
    ai,
    storage: mediaStorage,
    styling: system.styling,
    ledger: system.ledger,
    // Stand-in for the S3 event → RenditionFn, as for uploads.
    onGenerated: renderLocally,
  },
  lookRender: {
    ai,
    storage: mediaStorage,
    styling: system.styling,
    frames: system.frames,
    model: system.modelRender,
    ledger: system.ledger,
    onGenerated: renderLocally,
  },
  avatarCell: { ai, storage: mediaStorage, cells: system.avatarCells, ledger: system.ledger },
  daily: {
    ai,
    storage: mediaStorage,
    styling: system.styling,
    ledger: system.ledger,
    weather: createWeather(),
    onGenerated: renderLocally,
  },
  travel: { ai, styling: system.styling, ledger: system.ledger, tripWeather: createTripWeather() },
});

export function runInline(jobId: string): Promise<RunOutcome> {
  return runJob(jobId, { jobs: system.jobs, handlers, logger });
}
