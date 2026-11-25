import type { PostHog, PostHogConfig } from 'posthog-js/dist/module.no-external';
import { type Analytics, createAnalytics, type EventName, UNRECORDED } from './index';

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

const BLOCKED = [
  'img',
  'picture',
  'video',
  'canvas',
  'svg image',
  '[style*="background-image"]',
  'input[type="file"]',
];

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
    // SEC-84 (owner, 16 Nov 2026): with her yes to recordings, her words show — the text on
    // screen and what she types — so a recording can be read for what she asks Robes for. Photos
    // and file names never record (a photo drawn as a CSS background included), nor her email or
    // anything marked UNRECORDED.
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

// What she does between her yes and PostHog having loaded is held, at most this many events.
export const MAX_PENDING = 50;

export function createBrowserAnalytics(
  config: BrowserAnalyticsConfig,
  load: LoadPostHog = loadPostHog,
): BrowserAnalytics {
  let client: Client | null = null;
  let active = false;
  // Events tracked while a start() is loading, sent in order once it has. Null whenever no start()
  // is in flight, so nothing is ever held before her yes; stop() and a failed load drop it.
  // Native twin: createNativeAnalytics (mobile/src/lib/analytics.tsx).
  let pending: [EventName, Record<string, unknown>][] | null = null;
  // Bumped by every start() and stop(): a start overtaken by either never turns capture on.
  let attempt = 0;

  const analytics = createAnalytics({
    capture: (event, properties) => {
      if (active) client?.capture(event, properties);
      else if (pending && pending.length < MAX_PENDING) pending.push([event, properties]);
    },
    identify: (userId) => {
      if (active) client?.identify(userId);
    },
    reset: () => client?.reset(),
  });

  return {
    ...analytics,
    async start({ userId, replay }) {
      const mine = ++attempt;
      if (!active) pending ??= [];
      let loaded: Client;
      try {
        // The loader also pulls in the replay recorder the first time replay is granted.
        loaded = await load(replay);
      } catch (err) {
        if (mine === attempt) pending = null;
        throw err;
      }
      if (mine !== attempt) return;
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
      const held = pending ?? [];
      pending = null;
      for (const [event, properties] of held) client.capture(event, properties);
    },
    stop() {
      attempt++;
      pending = null;
      active = false;
      if (!client) return;
      client.stopSessionRecording();
      client.opt_out_capturing();
      client.reset();
    },
  };
}
