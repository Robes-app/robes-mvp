import * as Sentry from '@sentry/nextjs';

// Sentry runs only when SENTRY_DSN is set (packages/config); both runtimes share one setup.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs' && process.env.NEXT_RUNTIME !== 'edge') return;
  const { env } = await import('./server/env');
  const { sentryOptions } = await import('./lib/sentry-options');
  const config = env.observability.sentry;
  if (config) Sentry.init(sentryOptions(config));
}

export const onRequestError = Sentry.captureRequestError;
