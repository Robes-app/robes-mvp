import type { PostHog, PostHogConfig } from 'posthog-js/dist/module.no-external';
import { type Analytics, createAnalytics } from './index';

export interface BrowserAnalyticsConfig {
  key: string;
  host: string;
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
  if (replay) await import('posthog-js/dist/posthog-recorder');
  return posthog;
};

export function posthogOptions(config: BrowserAnalyticsConfig, replay: boolean) {
  return {
    api_host: config.host,
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    // Only catalogue events leave the browser: no autocapture of DOM text, no page-leave pings.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
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
    // SEC-84: replay masks every input, all text and all media.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      blockSelector: 'img, picture, video, canvas, svg image',
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
