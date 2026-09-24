import { type RouteKey, type Routes, routes, type SseRouteKey } from '@robes/contracts';
import type { z } from 'zod';
import type { ApiClient, ParamsOf } from './index';

export type EventsOf<K extends SseRouteKey> = Routes[K]['events'];
export type EventName<K extends SseRouteKey> = keyof EventsOf<K> & string;
export type EventData<K extends SseRouteKey, E extends EventName<K>> = z.output<EventsOf<K>[E]>;

export interface EventSourceLike {
  readonly readyState: number;
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void;
  close(): void;
}

// The browser EventSource, or an injected implementation on native (e.g. one that sends headers).
export type EventSourceFactory = (url: string) => EventSourceLike;

export const EVENT_SOURCE_CLOSED = 2;

export type EventHandlers<K extends SseRouteKey> = {
  [E in EventName<K>]?: (data: EventData<K, E>) => void;
};

export interface OpenEventsOptions<K extends SseRouteKey> {
  params: ParamsOf<K>;
  on: EventHandlers<K>;
  // `closed`: the server refused or ended the stream for good; otherwise the source is retrying.
  onError?: (state: { closed: boolean }) => void;
  // Payloads that fail the contract are dropped; this reports them.
  onInvalid?: (event: EventName<K>, error: unknown) => void;
  eventSource?: EventSourceFactory;
}

export interface EventStream {
  close(): void;
  readonly closed: boolean;
}

function browserEventSource(url: string): EventSourceLike {
  const Impl = (globalThis as { EventSource?: new (url: string) => EventSourceLike }).EventSource;
  if (!Impl) throw new TypeError('No EventSource available; pass `eventSource`');
  return new Impl(url);
}

function parseData(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  return JSON.parse(raw);
}

// Opens an `sse: true` route and delivers each event's payload parsed by its contract schema.
export function openEvents<K extends SseRouteKey>(
  client: Pick<ApiClient, 'url'>,
  key: K,
  options: OpenEventsOptions<K>,
): EventStream {
  const def = routes[key as RouteKey] as Routes[SseRouteKey];
  const url = client.url(key, options.params as Record<string, string> | undefined);
  const source = (options.eventSource ?? browserEventSource)(url);
  let closed = false;

  const schemas = def.events as Record<string, z.ZodType>;
  for (const [name, schema] of Object.entries(schemas)) {
    const handler = (options.on as Record<string, ((data: unknown) => void) | undefined>)[name];
    if (!handler) continue;
    source.addEventListener(name, (event) => {
      if (closed) return;
      let data: unknown;
      try {
        data = schema.parse(parseData(event.data));
      } catch (error) {
        options.onInvalid?.(name as EventName<K>, error);
        return;
      }
      handler(data);
    });
  }
  source.addEventListener('error', () => {
    if (closed) return;
    const gone = source.readyState === EVENT_SOURCE_CLOSED;
    if (gone) closed = true;
    options.onError?.({ closed: gone });
  });

  return {
    close() {
      closed = true;
      source.close();
    },
    get closed() {
      return closed;
    },
  };
}
