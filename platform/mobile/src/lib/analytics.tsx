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

// Loaded once she is signed in and has said yes to usage counts (SEC-84).
const loadPostHog: LoadPostHog = async ({ key, host }) => {
  const { PostHog } = await import('posthog-react-native');
  return new PostHog(key, {
    host,
    personProfiles: 'identified_only',
    // Catalogue events and uncaught JS errors only: no lifecycle pings.
    captureAppLifecycleEvents: false,
    errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
    // Recordings run only on her yes to them, started and stopped by `start` (SEC-84, owner
    // 16 Nov 2026): her words show, photos never do, nor a view marked UNRECORDED (her email,
    // the sign-in code). Web twin: posthogOptions in @robes/analytics/browser.
    enableSessionReplay: false,
    sessionReplayConfig: {
      maskAllTextInputs: false,
      maskAllImages: true,
      maskAllSandboxedViews: true,
      captureLog: false,
      captureNetworkTelemetry: false,
    },
  }) as unknown as Client;
};

export interface NativeAnalytics extends Analytics {
  // `recordings`: her yes to screen recordings; without it none runs.
  start(userId: string, options?: { recordings?: boolean }): Promise<void>;
  stop(): void;
  // A failure the app caught and showed her (a toast, an error line): autocapture never sees it.
  reportError(error: unknown): void;
  isActive(): boolean;
}

// What she does between her yes and PostHog having loaded is held, at most this many events.
const MAX_PENDING = 50;

// Same contract as the web's browser analytics: `start` once she has said yes, `stop` when she
// withdraws it or on sign-out. Every event is checked against the shared catalogue first. What
// she does while a `start` is loading is held and sent once it has; nothing is held before her
// yes, and `stop` or a failed load drops it. Web twin: createBrowserAnalytics.
export function createNativeAnalytics(
  config: PostHogConfig | null,
  load: LoadPostHog = loadPostHog,
): NativeAnalytics {
  let client: Client | null = null;
  // One PostHog for the app: overlapping starts share the load.
  let loading: Promise<Client> | null = null;
  let active = false;
  let pending: ((c: Client) => void)[] | null = null;
  // Bumped by every start and stop: a start overtaken by either never turns capture on.
  let attempt = 0;
  let consented = false;
  const send = (fn: (c: Client) => void) => {
    if (active && client) fn(client);
    else if (pending && pending.length < MAX_PENDING) pending.push(fn);
  };
  const silence = (c: Client) => {
    void c.stopSessionRecording();
    void c.optOut();
    c.reset();
  };
  const analytics = createAnalytics({
    capture: (event, properties) => send((c) => c.capture(event, properties)),
    identify: (userId) => {
      if (active) client?.identify(userId);
    },
    reset: () => client?.reset(),
  });
  return {
    ...analytics,
    async start(userId, options) {
      if (!config) return;
      const mine = ++attempt;
      consented = true;
      if (!active) pending ??= [];
      const fresh = !client;
      try {
        if (client) await client.optIn();
        else {
          loading ??= load(config).then(async (c) => {
            // Staging and production share one project for now.
            await c.register({ environment: config.environment });
            return c;
          });
          client = await loading;
        }
      } catch (err) {
        loading = null;
        if (mine === attempt) pending = null;
        throw err;
      }
      if (mine !== attempt) {
        // Withdrawn while it loaded: PostHog runs from its constructor, and stop() found nothing
        // to silence.
        if (!consented && fresh) silence(client);
        return;
      }
      active = true;
      client.identify(userId);
      const held = pending ?? [];
      pending = null;
      for (const fn of held) fn(client);
      if (options?.recordings) await client.startSessionRecording();
      else await client.stopSessionRecording();
    },
    stop() {
      attempt++;
      consented = false;
      pending = null;
      active = false;
      if (client) silence(client);
    },
    reportError(error) {
      send((c) => c.captureException(error));
    },
    isActive: () => active,
  };
}

export const nativeAnalytics = createNativeAnalytics(POSTHOG);

// One question answers all three switches (Annie, 19 Nov): usage counts, screen recordings and
// Share my looks. Each stays its own switch in You › Your data.
const answerAll = (yes: boolean) => ({ analytics: yes, recordings: yes, look_sharing: yes });

// Signed-in shell: nothing is counted until she says yes (SEC-84). She is asked once, while she
// has given no answer (null); after that the switches in You › Your data are the way to change it.
// Web twin: app/src/components/usage-ask.tsx.
export function AnalyticsSetup(): ReactElement {
  const me = useApi('me.get');
  const { consents, give } = useConsents();
  const userId = me.data?.id;
  const allowed = consents?.analytics === true;
  // Only her yes to recordings that show her words; an older `replay` yes was to masked ones.
  const recordings = allowed && consents?.recordings === true;
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
