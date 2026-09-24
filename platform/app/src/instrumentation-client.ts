import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './lib/sentry-options';

// Build-time values (next.config env); no DSN means no Sentry in the browser.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init(
    sentryOptions({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'dev',
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    }),
  );
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
