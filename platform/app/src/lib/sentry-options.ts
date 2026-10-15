import type { SentryConfig } from '@robes/config';
import { scrubBreadcrumb, scrubEvent } from '@robes/logger/scrub';

// Shared by browser and server init: no default PII, and every event goes through scrub (SEC-83).
export function sentryOptions(config: SentryConfig) {
  return {
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
