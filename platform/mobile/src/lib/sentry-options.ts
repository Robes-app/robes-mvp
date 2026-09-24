import { scrubBreadcrumb, scrubEvent } from '@robes/logger/scrub';

// Same rules as the web (SEC-83): no default PII; every event and breadcrumb is scrubbed.
// Expo Go has no Sentry native module, so native crash capture is on only in dev/EAS builds.
export function sentryOptions(opts: {
  dsn: string;
  environment: string;
  release: string;
  expoGo: boolean;
}) {
  return {
    dsn: opts.dsn,
    environment: opts.environment,
    release: opts.release,
    enableNative: !opts.expoGo,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
