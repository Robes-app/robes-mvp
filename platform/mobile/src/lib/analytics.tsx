import { type Analytics, createAnalytics } from '@robes/analytics';
import { useApi } from '@robes/api-client/react';
import { useEffect } from 'react';
import { POSTHOG } from './config';
import { report } from './report';

interface Client {
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string): void;
  reset(): void;
  optIn(): Promise<void> | void;
  optOut(): Promise<void> | void;
  register(properties: Record<string, string>): Promise<void> | void;
  captureException(error: unknown): void;
}
type PostHogConfig = { key: string; host: string; environment: string };
export type LoadPostHog = (config: PostHogConfig) => Promise<Client>;

// Loaded once she is signed in, unless she has turned analytics off in You › Privacy (SEC-84).
const loadPostHog: LoadPostHog = async ({ key, host }) => {
  const { PostHog } = await import('posthog-react-native');
  return new PostHog(key, {
    host,
    personProfiles: 'identified_only',
    // Catalogue events and uncaught JS errors only: no lifecycle pings, no replay on mobile.
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
  }) as unknown as Client;
};

export interface NativeAnalytics extends Analytics {
  start(userId: string): Promise<void>;
  stop(): void;
  // A failure the app caught and showed her (a toast, an error line): autocapture never sees it.
  reportError(error: unknown): void;
  isActive(): boolean;
}

// Same contract as the web's browser analytics: `start` unless she has turned it off, `stop` when she does
// or on sign-out. Every event is checked against the shared catalogue first.
export function createNativeAnalytics(
  config: PostHogConfig | null,
  load: LoadPostHog = loadPostHog,
): NativeAnalytics {
  let client: Client | null = null;
  let active = false;
  const analytics = createAnalytics({
    capture: (event, properties) => {
      if (active) client?.capture(event, properties);
    },
    identify: (userId) => {
      if (active) client?.identify(userId);
    },
    reset: () => client?.reset(),
  });
  return {
    ...analytics,
    async start(userId) {
      if (!config) return;
      if (client) await client.optIn();
      else {
        client = await load(config);
        // Staging and production share one project for now.
        await client.register({ environment: config.environment });
      }
      active = true;
      client.identify(userId);
    },
    stop() {
      active = false;
      if (!client) return;
      void client.optOut();
      client.reset();
    },
    reportError(error) {
      if (active) client?.captureException(error);
    },
    isActive: () => active,
  };
}

export const nativeAnalytics = createNativeAnalytics(POSTHOG);

// Signed-in shell: on for everyone unless she turns analytics off in You › Privacy (null = never
// asked = on), and follows that switch as it changes.
export function AnalyticsSetup(): null {
  const me = useApi('me.get');
  const consents = useApi('me.consents.get');
  const userId = me.data?.id;
  const allowed = consents.data !== undefined && consents.data.analytics !== false;
  useEffect(() => {
    if (userId && allowed)
      void nativeAnalytics.start(userId).catch((err) => report(err, 'analytics.start'));
    else nativeAnalytics.stop();
  }, [userId, allowed]);
  return null;
}
