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

// Review files one photo's (or one link's) answers: one `pieces_filed`, then `wardrobe_added` for
// each piece kept in her wardrobe. Shared by the web and native Review.
export function trackFiled(
  track: Analytics['track'],
  source: 'photo' | 'link',
  answers: readonly { state: 'add' | 'skip' }[],
  to: 'wardrobe' | 'wishlist',
): void {
  const n = answers.filter((a) => a.state === 'add').length;
  track('pieces_filed', { source, n, skipped: answers.length - n, to });
  if (to !== 'wardrobe') return;
  for (let i = 1; i <= n; i++) track('wardrobe_added', { source, batch_n: n, batch_i: i });
}

export const noopAnalytics: Analytics = {
  track() {},
  identify() {},
  reset() {},
};
