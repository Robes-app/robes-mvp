import { setTimeout as sleep } from 'node:timers/promises';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { isUuid } from './auth';
import { ApiError } from './errors';
import { createMemoryRateLimiter } from './rate-limit';
import { createSseRouteFactory, type SseEvent } from './sse';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const JOB = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';

function setup(opts: { admins?: string[] } = {}) {
  const logger = { error: vi.fn() };
  const sseRoute = createSseRouteFactory({
    resolveUser: async (req) => {
      const sub = req.headers.get('authorization')?.match(/^Bearer session:(.+)$/)?.[1];
      return isUuid(sub) ? { id: sub } : null;
    },
    isAdmin: async (id) => (opts.admins ?? []).includes(id),
    rateLimiter: createMemoryRateLimiter(),
    clientIp: () => '203.0.113.9',
    logger,
  });
  return { sseRoute, logger };
}

const get = (as?: string, init: RequestInit = {}) =>
  new Request('http://x/api/v1/jobs/x/events', {
    ...init,
    headers: as ? { authorization: `Bearer session:${as}` } : {},
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function* from(events: SseEvent[]): AsyncIterable<SseEvent> {
  yield* events;
}

// Owner-only source: the other user's job is a 404, like getForUser returning nothing.
function jobEvents(sseRoute: ReturnType<typeof setup>['sseRoute'], extra = {}) {
  return sseRoute({
    auth: 'user',
    params: z.object({ id: z.uuid() }),
    rateLimit: { key: 'jobs.events', limit: 2, windowSeconds: 60 },
    ...extra,
    open: async ({ user, params }) => {
      if (user.id !== USER || params.id !== JOB) throw new ApiError('not_found');
      return from([
        { event: 'job', data: { status: 'running' } },
        { event: 'job', id: '2', data: { status: 'succeeded' } },
      ]);
    },
  });
}

describe('sseRoute()', () => {
  it('is tagged for the route manifest and cannot be public', () => {
    const { sseRoute } = setup();
    const GET = jobEvents(sseRoute);
    expect(GET.auth).toBe('user');
    expect(GET.builder).toBe('sseRoute');
    // @ts-expect-error SSE routes always require a session
    sseRoute({ auth: 'public', open: async () => from([]) });
  });

  it('returns 401 JSON without a session, before streaming', async () => {
    const { sseRoute } = setup();
    const res = await jobEvents(sseRoute)(get(), params(JOB));
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect((await res.json()).error.code).toBe('unauthenticated');
  });

  it('returns 404 for another user’s job and 400 for a bad id', async () => {
    const { sseRoute } = setup();
    const GET = jobEvents(sseRoute);
    expect((await GET(get(OTHER), params(JOB))).status).toBe(404);
    expect((await GET(get(USER), params('not-a-uuid'))).status).toBe(400);
  });

  it('streams events through the terminal one, then closes', async () => {
    const { sseRoute } = setup();
    const res = await jobEvents(sseRoute)(get(USER), params(JOB));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await res.text()).toBe(
      'retry: 1000\n\n' +
        'event: job\ndata: {"status":"running"}\n\n' +
        'id: 2\nevent: job\ndata: {"status":"succeeded"}\n\n',
    );
  });

  it('rate limits per user like route()', async () => {
    const { sseRoute } = setup();
    const GET = jobEvents(sseRoute);
    await GET(get(USER), params(JOB));
    await GET(get(USER), params(JOB));
    expect((await GET(get(USER), params(JOB))).status).toBe(429);
  });

  it('enforces admin mode', async () => {
    const { sseRoute } = setup();
    const GET = sseRoute({ auth: 'admin', open: async () => from([]) });
    expect((await GET(get(USER))).status).toBe(403);
  });

  it('sends heartbeats and stops the source at the max duration', async () => {
    const { sseRoute } = setup();
    let stopped = false;
    const GET = sseRoute({
      auth: 'user',
      heartbeatMs: 10,
      maxDurationMs: 60,
      open: async ({ signal }) =>
        (async function* () {
          yield { data: 'started' };
          try {
            await sleep(10_000, undefined, { signal });
          } catch {
            stopped = true;
          }
        })(),
    });
    const text = await (await GET(get(USER))).text();
    expect(text).toContain(': ping\n\n');
    expect(stopped).toBe(true);
  });

  it('aborts the source when the client disconnects', async () => {
    const { sseRoute } = setup();
    let aborted = false;
    const GET = sseRoute({
      auth: 'user',
      open: async ({ signal }) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        return (async function* () {
          yield { data: 1 };
          await sleep(10_000, undefined, { signal }).catch(() => {});
        })();
      },
    });
    const res = await GET(get(USER));
    const reader = res.body?.getReader();
    await reader?.read();
    await reader?.cancel();
    await vi.waitFor(() => expect(aborted).toBe(true));
  });

  it('logs a failing source without leaking it to the client', async () => {
    const { sseRoute, logger } = setup();
    const GET = sseRoute({
      auth: 'user',
      open: async () =>
        (async function* () {
          yield { data: 1 };
          throw new Error('db exploded');
        })(),
    });
    const text = await (await GET(get(USER))).text();
    expect(text).not.toContain('exploded');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: 'db exploded' }),
      'sse_error',
    );
  });
});
