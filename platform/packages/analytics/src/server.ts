import { PostHog } from 'posthog-node';
import { type EventName, type PropsArg, parseEvent } from './events';

export interface ServerAnalyticsClient {
  captureImmediate(message: {
    distinctId: string;
    event: string;
    properties: Record<string, unknown>;
    disableGeoip?: boolean;
  }): Promise<void>;
  shutdown(): Promise<void>;
}

export interface ServerAnalytics {
  // Keyed by user id only; sends nothing unless that user has granted analytics consent.
  capture<E extends EventName>(userId: string, event: E, ...props: PropsArg<E>): Promise<void>;
  shutdown(): Promise<void>;
}

export function createPostHogClient(key: string, host: string): ServerAnalyticsClient {
  return new PostHog(key, { host, flushAt: 1, flushInterval: 0, disableGeoip: true });
}

export function createServerAnalytics(deps: {
  client: ServerAnalyticsClient;
  hasConsent(userId: string): Promise<boolean>;
}): ServerAnalytics {
  return {
    async capture(userId, event, ...[props]) {
      const parsed = parseEvent(event, props);
      if (!parsed.ok || !(await deps.hasConsent(userId))) return;
      // Only the validated catalogue props: no email, name or person properties ever.
      await deps.client.captureImmediate({
        distinctId: userId,
        event: parsed.event,
        properties: { ...parsed.properties, $process_person_profile: false },
        disableGeoip: true,
      });
    },
    shutdown: () => deps.client.shutdown(),
  };
}

export const noopServerAnalytics: ServerAnalytics = {
  async capture() {},
  async shutdown() {},
};
