import 'server-only';
import {
  createPostHogClient,
  createServerAnalytics,
  noopServerAnalytics,
  type ServerAnalytics,
} from '@robes/analytics/server';
import { verifiedUserId } from '@robes/db';
import { hasAnalyticsConsent } from './consents';
import { repos } from './db';
import { env } from './env';

const posthog = env.observability.posthog;

// Server events are consent-gated per user, like the browser (SEC-84).
export const serverAnalytics: ServerAnalytics = posthog
  ? createServerAnalytics({
      client: createPostHogClient(posthog.key, posthog.host),
      hasConsent: (userId) => hasAnalyticsConsent(repos, verifiedUserId(userId)),
    })
  : noopServerAnalytics;
