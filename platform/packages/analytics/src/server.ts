import { PostHog } from 'posthog-node';
import { type EventName, type PropsArg, parseEvent } from './events';

export interface ServerAnalyticsClient {
  captureImmediate(message: {
    distinctId: string;
    event: string;
    properties: Record<string, unknown>;
    disableGeoip?: boolean;
  }): Promise<void>;
  captureExceptionImmediate(
    error: unknown,
    distinctId?: string,
    properties?: Record<string, unknown>,
  ): Promise<void>;
  shutdown(): Promise<void>;
}

export interface ServerAnalytics {
  // Keyed by user id only; sends nothing unless that user has granted analytics consent.
  capture<E extends EventName>(userId: string, event: E, ...props: PropsArg<E>): Promise<void>;
  shutdown(): Promise<void>;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// SEC-83: an error message can carry an address; strip it before it leaves the server.
export function scrubExceptions<E extends { properties?: Record<string, unknown> }>(
  event: E | null,
) {
  const list = event?.properties?.$exception_list;
  if (Array.isArray(list)) {
    for (const ex of list) {
      if (ex && typeof ex.value === 'string') ex.value = ex.value.replace(EMAIL, '[redacted]');
    }
  }
  return event;
}

export function createPostHogClient(key: string, host: string): ServerAnalyticsClient {
  return new PostHog(key, {
    host,
    flushAt: 1,
    flushInterval: 0,
    disableGeoip: true,
    before_send: scrubExceptions,
  });
}

export interface ErrorReporter {
  // Anonymous (no person): reports reach PostHog error tracking whatever her consent, like logs.
  capture(error: unknown, properties?: Record<string, unknown>): Promise<void>;
}

export function createErrorReporter(
  client: ServerAnalyticsClient,
  environment: string,
): ErrorReporter {
  return {
    async capture(error, properties) {
      await client
        .captureExceptionImmediate(error, undefined, { ...properties, environment })
        .catch(() => undefined);
    },
  };
}

export const noopErrorReporter: ErrorReporter = { async capture() {} };

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
