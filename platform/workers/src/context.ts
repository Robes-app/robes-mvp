import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { parseEnv, type WorkerEnv, workerEnv } from '@robes/config';
import { createDb, createSystemRepositories, type SystemRepositories } from '@robes/db';
import {
  createHandlers,
  createInlineTransport,
  createJobAi,
  createSqsTransport,
  type JobLogger,
  type JobTransport,
  type RunOutcome,
  runJob,
} from '@robes/jobs';
import { createLogger } from '@robes/logger';
import { createMediaBucket, createMediaStorage, type MediaStorage } from '@robes/media/storage';

export interface WorkerContext {
  system: SystemRepositories;
  // The media bucket, when this function has one (MEDIA_BUCKET is set only where S3 is granted).
  storage: MediaStorage | null;
  logger: JobLogger;
  run(jobId: string): Promise<RunOutcome>;
  // Where re-enqueued jobs go: SQS when configured, in-process in dev.
  transport(): JobTransport;
  // Waits for in-process runs started by the dev transport, then closes the pool.
  close(): Promise<void>;
}

async function readSecret(arn: string | undefined): Promise<string> {
  const res = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) throw new Error('secret has no value');
  return res.SecretString;
}

async function resolveDatabaseUrl(env: WorkerEnv): Promise<string> {
  return env.DATABASE_URL ?? readSecret(env.DATABASE_URL_SECRET_ARN);
}

async function resolveGeminiKey(env: WorkerEnv): Promise<string | undefined> {
  if (env.GEMINI_API_KEY) return env.GEMINI_API_KEY;
  return env.GEMINI_API_KEY_SECRET_ARN ? readSecret(env.GEMINI_API_KEY_SECRET_ARN) : undefined;
}

async function createWorkerContext(): Promise<WorkerContext> {
  const env = parseEnv(workerEnv, process.env);
  const db = createDb({
    connectionString: await resolveDatabaseUrl(env),
    max: 2,
    applicationName: 'robes-worker',
  });
  const system = createSystemRepositories(db);
  const logger = createLogger({ service: 'robes-workers' });
  const storage = env.MEDIA_BUCKET
    ? createMediaStorage(
        createMediaBucket({
          bucket: env.MEDIA_BUCKET,
          region: env.AWS_REGION ?? 'eu-west-1',
          endpoint: env.MEDIA_S3_ENDPOINT,
          credentials:
            env.MEDIA_S3_ACCESS_KEY_ID && env.MEDIA_S3_SECRET_ACCESS_KEY
              ? {
                  accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID,
                  secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY,
                }
              : undefined,
        }),
      )
    : null;
  const ai = storage
    ? createJobAi({ appEnv: env.APP_ENV, geminiApiKey: await resolveGeminiKey(env) })
    : null;
  // Generated frames land as uploads, so the S3 event renders them; no onGenerated here.
  const handlers = createHandlers(
    storage && ai
      ? {
          wardrobeAnalyse: { ai, storage, pieces: system.pieces, ledger: system.ledger },
          stylePiece: { ai, storage, styling: system.styling, ledger: system.ledger },
          styleAnalyse: { ai, storage, profiles: system.styleAnalysis, ledger: system.ledger },
        }
      : {},
  );
  const run = (jobId: string): Promise<RunOutcome> =>
    runJob(jobId, { jobs: system.jobs, handlers, logger });
  const inline: Promise<void>[] = [];
  const queueUrl = env.JOBS_INTERACTIVE_QUEUE_URL;
  const transport = queueUrl
    ? createSqsTransport({ queueUrl })
    : env.APP_ENV === 'dev'
      ? createInlineTransport({ run, schedule: (task) => void inline.push(task()), logger })
      : null;

  return {
    system,
    storage,
    logger,
    run,
    transport() {
      if (!transport) throw new Error('JOBS_INTERACTIVE_QUEUE_URL is required outside dev');
      return transport;
    },
    async close() {
      await Promise.all(inline);
      await db.destroy();
    },
  };
}

let current: Promise<WorkerContext> | undefined;

// One context per Lambda container; a failed cold start is retried on the next invocation.
export function workerContext(): Promise<WorkerContext> {
  current ??= createWorkerContext().catch((err: unknown) => {
    current = undefined;
    throw err;
  });
  return current;
}
