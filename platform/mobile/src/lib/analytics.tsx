import { type Analytics, createAnalytics } from '@robes/analytics';
import { useApi } from '@robes/api-client/react';
import { useEffect } from 'react';
import { POSTHOG } from './config';

interface Client {
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string): void;
  reset(): void;
  optIn(): Promise<void> | void;
  optOut(): Promise<void> | void;
}
export type LoadPostHog = (config: { key: string; host: string }) => Promise<Client>;

// Loaded only after consent, so nothing reaches PostHog before she says yes (SEC-84).
const loadPostHog: LoadPostHog = async ({ key, host }) => {
  const { PostHog } = await import('posthog-react-native');
  return new PostHog(key, {
    host,
    personProfiles: 'identified_only',
    // Catalogue events only: no lifecycle pings, no session replay on mobile.
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
  }) as unknown as Client;
};

export interface NativeAnalytics extends Analytics {
  start(userId: string): Promise<void>;
  stop(): void;
}

// Same contract as the web's browser analytics: `start` after consent, `stop` when withdrawn
// or on sign-out. Every event is checked against the shared catalogue first.
export function createNativeAnalytics(
  config: { key: string; host: string } | null,
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
      else client = await load(config);
      active = true;
      client.identify(userId);
    },
    stop() {
      active = false;
      if (!client) return;
      void client.optOut();
      client.reset();
    },
  };
}

export const nativeAnalytics = createNativeAnalytics(POSTHOG);

// Signed-in shell: follows her analytics consent (You › Privacy) as it changes.
export function AnalyticsSetup(): null {
  const me = useApi('me.get');
  const consents = useApi('me.consents.get');
  const userId = me.data?.id;
  const allowed = consents.data?.analytics === true;
  useEffect(() => {
    if (userId && allowed) void nativeAnalytics.start(userId).catch(() => undefined);
    else nativeAnalytics.stop();
  }, [userId, allowed]);
  return null;
}
