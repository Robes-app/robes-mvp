import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { parseEnv, type WorkerEnv, workerEnv } from '@robes/config';
import { createDb, createSystemRepositories, type SystemRepositories } from '@robes/db';
import {
  consoleJobLogger,
  createHandlers,
  createInlineTransport,
  createSqsTransport,
  type JobLogger,
  type JobTransport,
  type RunOutcome,
  runJob,
} from '@robes/jobs';

export interface WorkerContext {
  system: SystemRepositories;
  logger: JobLogger;
  run(jobId: string): Promise<RunOutcome>;
  // Where re-enqueued jobs go: SQS when configured, in-process in dev.
  transport(): JobTransport;
  // Waits for in-process runs started by the dev transport, then closes the pool.
  close(): Promise<void>;
}

async function resolveDatabaseUrl(env: WorkerEnv): Promise<string> {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const res = await new SecretsManagerClient({}).send(
    new GetSecretValueCommand({ SecretId: env.DATABASE_URL_SECRET_ARN }),
  );
  if (!res.SecretString) throw new Error('database secret has no value');
  return res.SecretString;
}

async function createWorkerContext(): Promise<WorkerContext> {
  const env = parseEnv(workerEnv, process.env);
  const db = createDb({
    connectionString: await resolveDatabaseUrl(env),
    max: 2,
    applicationName: 'robes-worker',
  });
  const system = createSystemRepositories(db);
  const logger = consoleJobLogger;
  const handlers = createHandlers();
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
