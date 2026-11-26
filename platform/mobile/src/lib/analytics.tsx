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
  startSessionRecording(resumeCurrent?: boolean): Promise<void>;
  stopSessionRecording(): Promise<void>;
}
type PostHogConfig = { key: string; host: string; environment: string };
export type LoadPostHog = (config: PostHogConfig) => Promise<Client>;

// Recordings run only on her `full_recordings` yes, started and stopped by `start` (SEC-84). They
// show the app as she sees it — her words, her photos, crops and her drawn model — so a tester's
// recording shows a render bug (Annie, 26 Nov 2026). Never a view marked UNRECORDED (her email,
// the sign-in code), nor the system's photo picker (her camera roll is not Robes). No console
// lines or network calls. Web twin: posthogOptions in @robes/analytics/browser.
export const SESSION_REPLAY_CONFIG = {
  maskAllTextInputs: false,
  maskAllImages: false,
  maskAllSandboxedViews: true,
  captureLog: false,
  captureNetworkTelemetry: false,
} as const;

// Loaded once she is signed in and has said yes to usage counts (SEC-84).
const loadPostHog: LoadPostHog = async ({ key, host }) => {
  const { PostHog } = await import('posthog-react-native');
  return new PostHog(key, {
    host,
    personProfiles: 'identified_only',
    // Catalogue events and uncaught JS errors only: no lifecycle pings.
    captureAppLifecycleEvents: false,
    errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
    enableSessionReplay: false,
    sessionReplayConfig: { ...SESSION_REPLAY_CONFIG },
  }) as unknown as Client;
};

export interface NativeAnalytics extends Analytics {
  // `recordings`: her `full_recordings` yes to screen recordings; without it none runs.
  start(userId: string, options?: { recordings?: boolean }): Promise<void>;
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
    async start(userId, options) {
      if (!config) return;
      if (client) await client.optIn();
      else {
        client = await load(config);
        // Staging and production share one project for now.
        await client.register({ environment: config.environment });
      }
      active = true;
      client.identify(userId);
      if (options?.recordings) await client.startSessionRecording();
      else await client.stopSessionRecording();
    },
    stop() {
      active = false;
      if (!client) return;
      void client.stopSessionRecording();
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

// One question answers all three switches (Annie, 19 Nov): usage counts, screen recordings and
// Share my looks. Each stays its own switch in You › Your data.
const answerAll = (yes: boolean) => ({ analytics: yes, full_recordings: yes, look_sharing: yes });

// Signed-in shell: nothing is counted until she says yes (SEC-84). She is asked once, while she
// has given no answer (null); after that the switches in You › Your data are the way to change it.
// Web twin: app/src/components/usage-ask.tsx.
export function AnalyticsSetup(): ReactElement {
  const me = useApi('me.get');
  const { consents, give } = useConsents();
  const userId = me.data?.id;
  const allowed = consents?.analytics === true;
  // Only her yes to recordings that show her photos; an older `recordings` or `replay` yes was to
  // recordings with photos (or every word) hidden, so it starts none (Annie, 26 Nov 2026).
  const recordings = allowed && consents?.full_recordings === true;
  useEffect(() => {
    if (userId && allowed)
      void nativeAnalytics
        .start(userId, { recordings })
        .catch((err) => report(err, 'analytics.start'));
    else nativeAnalytics.stop();
  }, [userId, allowed, recordings]);

  return (
    <AlertDialog
      open={consents?.analytics === null}
      title={copy.askTitle}
      message={copy.askBody}
      actions={[
        { label: copy.askYes, variant: 'primary', onPress: () => give(answerAll(true)) },
        { label: copy.askNo, variant: 'outline', onPress: () => give(answerAll(false)) },
      ]}
      // A question that must be answered: a tap outside leaves it open.
      onDismiss={() => {}}
      testID="usage-ask"
    />
  );
}
