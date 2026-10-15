import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { parseEnv, type WorkerEnv, workerEnv } from '@robes/config';
import {
  createDb,
  createRepositories,
  createSystemRepositories,
  type SystemRepositories,
} from '@robes/db';
import {
  createAnchorRenderer,
  createDayForecast,
  createExpoPushSender,
  createHandlers,
  createInlineTransport,
  createJobAi,
  createJobBatch,
  createSqsTransport,
  createTripWeather,
  createWeather,
  fetchLink,
  type JobLogger,
  type JobTransport,
  type NotifyDeps,
  type OvernightDeps,
  type ReceiptDeps,
  type RunOutcome,
  runJob,
  sendReceiptMail,
} from '@robes/jobs';
import { createLogger } from '@robes/logger';
import { createMailer, type Mailer } from '@robes/mailer';
import { createMediaBucket, createMediaStorage, type MediaStorage } from '@robes/media/storage';

export interface WorkerContext {
  system: SystemRepositories;
  // The media bucket, when this function has one (MEDIA_BUCKET is set only where S3 is granted).
  storage: MediaStorage | null;
  logger: JobLogger;
  run(jobId: string): Promise<RunOutcome>;
  // Where re-enqueued jobs go: SQS when configured, in-process in dev.
  transport(): JobTransport;
  // Everything notifyFn needs to send the email sequence; throws where mail isn't configured.
  notify(): Promise<NotifyDeps>;
  // The overnight Today look (batchFn): selection, Batch API, and the interactive fallback.
  overnight(): Promise<OvernightDeps>;
  // Everything inboundFn needs to turn a forwarded receipt into a held Inbox row.
  inbound(): Promise<ReceiptDeps>;
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

async function resolveUnsubKey(env: WorkerEnv): Promise<string | undefined> {
  if (env.UNSUB_HMAC_KEY) return env.UNSUB_HMAC_KEY;
  return env.UNSUB_HMAC_KEY_SECRET_ARN ? readSecret(env.UNSUB_HMAC_KEY_SECRET_ARN) : undefined;
}

async function resolveExpoToken(env: WorkerEnv): Promise<string | undefined> {
  if (env.EXPO_ACCESS_TOKEN) return env.EXPO_ACCESS_TOKEN;
  return env.EXPO_ACCESS_TOKEN_SECRET_ARN
    ? readSecret(env.EXPO_ACCESS_TOKEN_SECRET_ARN)
    : undefined;
}

// SMTP to the local mail catcher in dev; SES (the function role) in AWS (ADR-021).
function workerMailer(env: WorkerEnv): Mailer {
  return env.SMTP_URL
    ? createMailer({ transport: 'smtp', url: env.SMTP_URL, from: env.MAIL_FROM })
    : createMailer({
        transport: 'ses',
        region: env.AWS_REGION ?? 'eu-west-1',
        from: env.MAIL_FROM,
        configurationSet: env.SES_CONFIGURATION_SET,
      });
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
  // Dev only: no S3 event locally, so frames the worker draws are rendered in-process when a CLI
  // registered a renderer; in AWS RenditionFn does this from the ObjectCreated event.
  const onGenerated =
    env.APP_ENV === 'dev' && storage && localRenderer
      ? localRenderer({ storage, assets: system.assets })
      : undefined;
  const ai = storage
    ? createJobAi({ appEnv: env.APP_ENV, geminiApiKey: await resolveGeminiKey(env) })
    : null;
  // Generated frames land as uploads, so the S3 event renders them; no onGenerated here.
  // Link imports need no AI or bucket; in AWS the isolated fetcher attaches the page result,
  // in dev the same SSRF-guarded fetch runs in-process.
  const linkImport = {
    intake: system.inboxIntake,
    ...(env.APP_ENV === 'dev' ? { fetchLink: (url: string) => fetchLink(url) } : {}),
  };
  const handlers = createHandlers(
    storage && ai
      ? {
          linkImport,
          wardrobeAnalyse: { ai, storage, pieces: system.pieces, ledger: system.ledger },
          stylePiece: {
            ai,
            storage,
            styling: system.styling,
            suggested: system.suggested,
            cells: system.modelRender,
            forecast: createDayForecast(),
            ledger: system.ledger,
          },
          lookRender: {
            ai,
            storage,
            styling: system.styling,
            frames: system.frames,
            model: system.modelRender,
            suggested: system.suggested,
            ledger: system.ledger,
            ...(onGenerated ? { onGenerated } : {}),
          },
          lookAsk: {
            ai,
            styling: system.styling,
            suggested: system.suggested,
            lookPrompt: system.lookPrompt,
            ledger: system.ledger,
          },
          avatarCell: { ai, storage, cells: system.avatarCells, ledger: system.ledger },
          styleAnalyse: { ai, storage, profiles: system.styleAnalysis, ledger: system.ledger },
          styleBrief: {
            ai,
            brief: system.styleBrief,
            styling: system.styling,
            ledger: system.ledger,
          },
          // Frames land as uploads, so the S3 event renders them (no onGenerated).
          daily: {
            ai,
            storage,
            styling: system.styling,
            ledger: system.ledger,
            weather: createWeather(),
          },
          travel: {
            ai,
            styling: system.styling,
            ledger: system.ledger,
            tripWeather: createTripWeather(),
          },
        }
      : { linkImport },
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
    async notify() {
      const unsubSecret = await resolveUnsubKey(env);
      if (!env.APP_URL || !unsubSecret) {
        throw new Error('notify needs APP_URL and the unsubscribe key');
      }
      return {
        notifier: system.notifier,
        mailer: workerMailer(env),
        appUrl: env.APP_URL,
        unsubSecret,
        logger,
        push: {
          sender: createExpoPushSender({ accessToken: await resolveExpoToken(env) }),
          tokens: system.pushDelivery,
        },
      };
    },
    async overnight() {
      if (!storage || !ai || !transport) {
        throw new Error('overnight needs the media bucket, AI and the interactive queue');
      }
      return {
        overnight: system.overnight,
        jobs: system.jobs,
        capacity: { isExhausted: system.ledger.isExhausted },
        daily: {
          ai,
          storage,
          styling: system.styling,
          ledger: system.ledger,
          weather: createWeather(),
        },
        batch: createJobBatch({ appEnv: env.APP_ENV, geminiApiKey: await resolveGeminiKey(env) }),
        transport,
        renderAnchor: createAnchorRenderer({ repos: createRepositories(db), transport, logger }),
        logger,
      };
    },
    async inbound() {
      if (!storage || !ai) throw new Error('inbound needs MEDIA_BUCKET');
      const domain =
        env.INBOUND_MAIL_DOMAIN ?? (env.APP_ENV === 'dev' ? 'in.robes.local' : undefined);
      if (!domain) throw new Error('inbound needs INBOUND_MAIL_DOMAIN');
      const unsubSecret = await resolveUnsubKey(env);
      const mail =
        env.APP_URL && unsubSecret
          ? {
              notifier: system.notifier,
              mailer: workerMailer(env),
              appUrl: env.APP_URL,
              unsubSecret,
            }
          : null;
      return {
        ai,
        storage,
        intake: system.inboxIntake,
        ledger: system.ledger,
        domain,
        logger,
        ...(mail ? { onHeld: async (held) => void (await sendReceiptMail(mail, held)) } : {}),
      };
    },
    async close() {
      await Promise.all(inline);
      await db.destroy();
    },
  };
}

type LocalRenderer = (deps: {
  storage: MediaStorage;
  assets: SystemRepositories['assets'];
}) => (key: string) => Promise<void>;
let localRenderer: LocalRenderer | undefined;

// Local CLIs only (never a Lambda entry): sharp must stay out of every worker bundle but
// RenditionFn's, so the renderer is injected by the caller rather than imported here.
export function setLocalRenditions(renderer: LocalRenderer): void {
  localRenderer = renderer;
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
