import type { z } from 'zod';
import type { AuthUser } from './auth';
import {
  type AuthMode,
  createGuards,
  type RateLimitRule,
  RawParams,
  type RouteContext,
  type RouteDeps,
  type RouteHandler,
} from './route';

export interface SseEvent {
  event?: string;
  id?: string;
  data: unknown;
}

export interface SseRouteOptions<A extends Exclude<AuthMode, 'public'>, P extends z.ZodType> {
  auth: A;
  params?: P;
  flag?: string;
  rateLimit?: RateLimitRule;
  heartbeatMs?: number;
  maxDurationMs?: number;
  // Runs before the first byte, so it can still fail with a JSON error (e.g. not_found).
  // The iterable must stop when `signal` aborts (client gone or max duration reached).
  open(args: {
    user: AuthUser;
    params: z.infer<P>;
    req: Request;
    requestId: string;
    signal: AbortSignal;
  }): Promise<AsyncIterable<SseEvent>>;
}

export const SSE_DEFAULTS = { heartbeatMs: 15_000, maxDurationMs: 5 * 60_000, retryMs: 1000 };

function frame({ event, id, data }: SseEvent): string {
  return `${id ? `id: ${id}\n` : ''}${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
}

// SSE twin of route(): same gates, auth, rate limit and params; never public (CLAUDE.md rule 9).
export function createSseRouteFactory(deps: RouteDeps) {
  const { admit, failure } = createGuards(deps);

  return function sseRoute<
    A extends Exclude<AuthMode, 'public'>,
    P extends z.ZodType = typeof RawParams,
  >(opts: SseRouteOptions<A, P>): RouteHandler {
    const handler = async (req: Request, ctx?: RouteContext): Promise<Response> => {
      const requestId = crypto.randomUUID();
      const stop = new AbortController();
      const signal = AbortSignal.any([
        stop.signal,
        req.signal,
        AbortSignal.timeout(opts.maxDurationMs ?? SSE_DEFAULTS.maxDurationMs),
      ]);
      let events: AsyncIterable<SseEvent>;
      try {
        const { user, params } = await admit(req, ctx, {
          auth: opts.auth,
          flag: opts.flag,
          rateLimit: opts.rateLimit,
          params: (opts.params ?? RawParams) as P,
        });
        events = await opts.open({ user, params, req, requestId, signal });
      } catch (err) {
        return failure(err, requestId);
      }

      const encoder = new TextEncoder();
      let open = true;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const write = (text: string): void => {
            if (open) controller.enqueue(encoder.encode(text));
          };
          const heartbeat = setInterval(
            () => write(': ping\n\n'),
            opts.heartbeatMs ?? SSE_DEFAULTS.heartbeatMs,
          );
          const pump = async (): Promise<void> => {
            try {
              write(`retry: ${SSE_DEFAULTS.retryMs}\n\n`);
              for await (const event of events) {
                if (signal.aborted) break;
                write(frame(event));
              }
            } catch (err) {
              if (!signal.aborted) {
                deps.logger.error(
                  { requestId, err: err instanceof Error ? err.message : String(err) },
                  'sse_error',
                );
              }
            } finally {
              clearInterval(heartbeat);
              stop.abort();
              if (open) {
                open = false;
                controller.close();
              }
            }
          };
          void pump();
        },
        cancel() {
          open = false;
          stop.abort();
        },
      });

      return new Response(body, {
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'private, no-store, no-transform',
          'x-accel-buffering': 'no',
          'x-request-id': requestId,
        },
      });
    };
    return Object.assign(handler, {
      auth: opts.auth,
      builder: 'sseRoute' as const,
      schemas: { params: opts.params },
    });
  };
}
