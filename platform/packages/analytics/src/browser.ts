import type { PostHog, PostHogConfig } from 'posthog-js/dist/module.no-external';
import { type Analytics, createAnalytics, UNRECORDED } from './index';

export interface BrowserAnalyticsConfig {
  key: string;
  host: string;
  // Tags every event and error: staging and production share one project.
  environment: string;
}

export interface ConsentedStart {
  userId: string;
  replay: boolean;
}

export interface BrowserAnalytics extends Analytics {
  // Call only once analytics consent is granted; loads PostHog on first call.
  start(opts: ConsentedStart): Promise<void>;
  // Consent withdrawn: stop capturing, stop replay and forget the identity.
  stop(): void;
}

type Client = Pick<
  PostHog,
  | 'init'
  | 'register'
  | 'capture'
  | 'identify'
  | 'reset'
  | 'opt_in_capturing'
  | 'opt_out_capturing'
  | 'startSessionRecording'
  | 'stopSessionRecording'
>;

export type LoadPostHog = (replay: boolean) => Promise<Client>;

// Bundled, no-CDN build: nothing is fetched from PostHog but the ingest API (CSP connect-src).
const loadPostHog: LoadPostHog = async (replay) => {
  const { default: posthog } = await import('posthog-js/dist/module.no-external');
  // The no-external build ships error tracking as a bundled extension, like the recorder.
  await import('posthog-js/dist/exception-autocapture');
  if (replay) await import('posthog-js/dist/posthog-recorder');
  return posthog;
};

// A file input's value is a file name from her device, not Robes' screen.
const BLOCKED = ['input[type="file"]'];

export function posthogOptions(config: BrowserAnalyticsConfig, replay: boolean) {
  return {
    api_host: config.host,
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    // Only catalogue events leave the browser: no autocapture of DOM text, no page-leave pings.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    // Uncaught errors reach PostHog error tracking (still only after consent).
    capture_exceptions: true,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    rageclick: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    disable_external_dependency_loading: true,
    mask_personal_data_properties: true,
    disable_session_recording: !replay,
    // Set here so no project setting can turn them on: console lines and request bodies can carry
    // her email or another value the recording hides.
    enable_recording_console_log: false,
    // SEC-84 (Annie, 26 Nov 2026): with her yes to Screen recordings and to Share my looks with
    // Robes (`look_sharing`), a recording shows the app as
    // she sees it — the text on screen, what she types, her photos, crops and her drawn model — so
    // a tester's recording shows a render bug. Never her email, a password, a file name or
    // anything marked UNRECORDED (the sign-in code, the admin pages). Canvas frames are not
    // recorded (rrweb's default); a live camera feed never is. Native twin: SESSION_REPLAY_CONFIG.
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true, email: true },
      blockClass: UNRECORDED,
      blockSelector: BLOCKED.join(', '),
      recordHeaders: false,
      recordBody: false,
    },
  } satisfies Partial<PostHogConfig>;
}

export function createBrowserAnalytics(
  config: BrowserAnalyticsConfig,
  load: LoadPostHog = loadPostHog,
): BrowserAnalytics {
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
    async start({ userId, replay }) {
      // The loader also pulls in the replay recorder the first time replay is granted.
      const loaded = await load(replay);
      if (client) {
        client.opt_in_capturing();
      } else {
        loaded.init(config.key, posthogOptions(config, replay));
        loaded.register({ environment: config.environment });
        client = loaded;
      }
      if (replay) client.startSessionRecording();
      else client.stopSessionRecording();
      active = true;
      client.identify(userId);
    },
    stop() {
      active = false;
      if (!client) return;
      client.stopSessionRecording();
      client.opt_out_capturing();
      client.reset();
    },
  };
}
