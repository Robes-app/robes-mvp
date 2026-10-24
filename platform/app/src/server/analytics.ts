import 'server-only';
import {
  createErrorReporter,
  createPostHogClient,
  createServerAnalytics,
  type ErrorReporter,
  noopErrorReporter,
  noopServerAnalytics,
  type ServerAnalytics,
} from '@robes/analytics/server';
import { verifiedUserId } from '@robes/db';
import { hasAnalyticsConsent } from './consents';
import { repos } from './db';
import { env } from './env';

const posthog = env.observability.posthog;
const client = posthog ? createPostHogClient(posthog.key, posthog.host) : null;

// Server events are consent-gated per user, like the browser (SEC-84).
export const serverAnalytics: ServerAnalytics = client
  ? createServerAnalytics({
      client,
      hasConsent: (userId) => hasAnalyticsConsent(repos, verifiedUserId(userId)),
    })
  : noopServerAnalytics;

export const errorReporter: ErrorReporter =
  client && posthog ? createErrorReporter(client, posthog.environment) : noopErrorReporter;
