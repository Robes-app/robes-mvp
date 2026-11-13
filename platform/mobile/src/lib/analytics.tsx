import { type Analytics, createAnalytics } from '@robes/analytics';
import { useApi } from '@robes/api-client/react';
import { consent as copy } from '@robes/copy';
import { AlertDialog } from '@robes/ui-native';
import { type ReactElement, useEffect } from 'react';
import { POSTHOG } from './config';
import { useConsents } from './consents';
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

// Loaded once she is signed in and has said yes to usage counts (SEC-84).
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

// Same contract as the web's browser analytics: `start` once she has said yes, `stop` when she
// withdraws it or on sign-out. Every event is checked against the shared catalogue first.
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

// Signed-in shell: nothing is counted until she says yes (SEC-84). She is asked once, while she
// has given no answer (null); after that the switch in You › Privacy is the way to change it.
// The web never asks on a page: its switch in You › Privacy starts off.
export function AnalyticsSetup(): ReactElement {
  const me = useApi('me.get');
  const { consents, give } = useConsents();
  const userId = me.data?.id;
  const allowed = consents?.analytics === true;
  useEffect(() => {
    if (userId && allowed)
      void nativeAnalytics.start(userId).catch((err) => report(err, 'analytics.start'));
    else nativeAnalytics.stop();
  }, [userId, allowed]);

  return (
    <AlertDialog
      open={consents?.analytics === null}
      title={copy.askTitle}
      message={copy.askBody}
      actions={[
        { label: copy.askYes, variant: 'primary', onPress: () => give({ analytics: true }) },
        { label: copy.askNo, variant: 'outline', onPress: () => give({ analytics: false }) },
      ]}
      // A question that must be answered: a tap outside leaves it open.
      onDismiss={() => {}}
      testID="usage-ask"
    />
  );
}
