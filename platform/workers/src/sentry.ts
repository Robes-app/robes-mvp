import { parseEnv, workerSentryEnv } from '@robes/config';
import { scrubBreadcrumb, scrubEvent } from '@robes/logger/scrub';
import * as Sentry from '@sentry/aws-serverless';

// Enabled only when SENTRY_DSN is set; a malformed Sentry config fails the cold start.
const config = process.env.SENTRY_DSN ? parseEnv(workerSentryEnv, process.env) : undefined;

if (config) {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

export const sentryEnabled = Boolean(config);

// Reports handler failures (then rethrows, so SQS retries/DLQ behave as before).
export function withSentry<H extends (...args: never[]) => Promise<unknown>>(handler: H): H {
  if (!config) return handler;
  return Sentry.wrapHandler(
    handler as unknown as Parameters<typeof Sentry.wrapHandler>[0],
  ) as unknown as H;
}
