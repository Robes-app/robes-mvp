import { type EventName, type PropsArg, parseEvent } from './events';

export * from './events';

export interface Analytics {
  track<E extends EventName>(event: E, ...props: PropsArg<E>): void;
  identify(userId: string): void;
  reset(): void;
}

export interface AnalyticsSink {
  capture(event: EventName, properties: Record<string, unknown>): void;
  identify(userId: string): void;
  reset(): void;
}

// Validates every event against the catalogue; anything unknown is dropped, never sent.
export function createAnalytics(
  sink: AnalyticsSink,
  onInvalid: (event: string, reason: string) => void = () => {},
): Analytics {
  return {
    track(event, ...[props]) {
      const parsed = parseEvent(event, props);
      if (parsed.ok) sink.capture(parsed.event, parsed.properties);
      else onInvalid(event, parsed.reason);
    },
    identify: (userId) => sink.identify(userId),
    reset: () => sink.reset(),
  };
}

export const noopAnalytics: Analytics = {
  track() {},
  identify() {},
  reset() {},
};
