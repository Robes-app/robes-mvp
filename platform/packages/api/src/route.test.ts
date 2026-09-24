import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { isUuid } from './auth';
import { createMemoryRateLimiter } from './rate-limit';
import { AUTH_FAILURE_LIMIT, createRouteFactory } from './route';

const USER = '11111111-1111-4111-8111-111111111111';

// Stand-in for the session resolver: "Bearer session:<uuid>" is a valid session.
async function sign(sub: string): Promise<string> {
  return `session:${sub}`;
}

async function setup(
  opts: { admins?: string[]; flags?: Record<string, boolean>; minAppVersion?: string } = {},
) {
  const logger = { error: vi.fn() };
  const captureError = vi.fn();
  const route = createRouteFactory({
    resolveUser: async (req) => {
      const sub = req.headers.get('authorization')?.match(/^Bearer session:(.+)$/)?.[1];
      return isUuid(sub) ? { id: sub } : null;
    },
    isAdmin: async (id) => (opts.admins ?? []).includes(id),
    isFlagEnabled: async (key) => opts.flags?.[key] ?? false,
    ...(opts.minAppVersion ? { minAppVersion: opts.minAppVersion } : {}),
    rateLimiter: createMemoryRateLimiter(),
    clientIp: () => '203.0.113.9',
    logger,
    captureError,
  });
  return { route, sign, logger, captureError };
}

const post = (body: unknown, token?: string, raw?: string) =>
  new Request('http://x/api/v1/t', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: raw ?? JSON.stringify(body),
  });

describe('route()', async () => {
  it('serves a public route and sets x-request-id', async () => {
    const { route } = await setup();
    const GET = route({
      auth: 'public',
      input: z.object({}),
      output: z.object({ ok: z.literal(true) }),
      handler: async () => ({ ok: true as const }),
    });
    const res = await GET(new Request('http://x/api/v1/health'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('exposes its auth mode for the route-manifest test', async () => {
    const { route } = await setup();
    const h = route({
      auth: 'user',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    });
    expect(h.auth).toBe('user');
  });

  it('401s a user route without a token or with a bad token', async () => {
    const { route } = await setup();
    const POST = route({
      auth: 'user',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    });
    expect((await POST(post({}))).status).toBe(401);
    const bad = await POST(post({}, 'nope'));
    expect(bad.status).toBe(401);
    expect((await bad.json()).error.code).toBe('unauthenticated');
  });

  it('passes the verified user to the handler and ignores body userId', async () => {
    const { route, sign } = await setup();
    const POST = route({
      auth: 'user',
      input: z.object({ note: z.string().max(10) }),
      output: z.object({ userId: z.string() }),
      handler: async ({ user }) => ({ userId: user.id }),
    });
    const res = await POST(post({ note: 'hi', userId: 'someone-else' }, await sign(USER)));
    expect(await res.json()).toEqual({ userId: USER });
  });

  it('403s admin routes for non-admins and allows admins', async () => {
    const { route, sign } = await setup({ admins: [USER] });
    const GET = route({
      auth: 'admin',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    });
    const other = '22222222-2222-4222-8222-222222222222';
    const req = async (sub: string) =>
      GET(new Request('http://x', { headers: { authorization: `Bearer ${await sign(sub)}` } }));
    expect((await req(other)).status).toBe(403);
    expect((await req(USER)).status).toBe(200);
  });

  it('returns 400 (never 500) for any JSON body that fails validation', async () => {
    const { route, sign } = await setup();
    const token = await sign(USER);
    const POST = route({
      auth: 'user',
      input: z.object({ prompt: z.string().min(1).max(300), ids: z.array(z.uuid()).max(3) }),
      output: z.object({}),
      handler: async () => ({}),
    });
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async (body) => {
        const res = await POST(post(body, token));
        expect([200, 400, 413]).toContain(res.status);
      }),
      { numRuns: 200 },
    );
    expect((await POST(post(null, token, '{not json'))).status).toBe(400);
  });

  it('413s bodies over 32KB', async () => {
    const { route, sign } = await setup();
    const POST = route({
      auth: 'user',
      input: z.object({}).passthrough(),
      output: z.object({}),
      handler: async () => ({}),
    });
    const res = await POST(post({ big: 'x'.repeat(33 * 1024) }, await sign(USER)));
    expect(res.status).toBe(413);
  });

  it('hides internal errors behind a generic message, logs and reports them', async () => {
    const { route, logger, captureError } = await setup();
    const GET = route({
      auth: 'public',
      input: z.object({}),
      output: z.object({}),
      handler: async () => {
        throw new Error('db password is hunter2');
      },
    });
    const res = await GET(new Request('http://x'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('hunter2');
    expect(logger.error).toHaveBeenCalledOnce();
    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      requestId: res.headers.get('x-request-id'),
    });
  });

  it('does not report expected API errors to error monitoring', async () => {
    const { route, captureError } = await setup();
    const GET = route({
      auth: 'user',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    });
    expect((await GET(new Request('http://x'))).status).toBe(401);
    expect(captureError).not.toHaveBeenCalled();
  });

  it('rate limits per user and sets Retry-After', async () => {
    const { route, sign } = await setup();
    const token = await sign(USER);
    const POST = route({
      auth: 'user',
      input: z.object({}),
      output: z.object({}),
      rateLimit: { key: 't', limit: 2, windowSeconds: 60 },
      handler: async () => ({}),
    });
    await POST(post({}, token));
    await POST(post({}, token));
    const res = await POST(post({}, token));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
  });

  it('always strips undeclared output fields (no leaks in production)', async () => {
    const { route } = await setup();
    const GET = route({
      auth: 'public',
      input: z.object({}),
      output: z.object({ name: z.string() }),
      handler: async () => ({ name: 'a', password_hash: 'x' }) as { name: string },
    });
    expect(await (await GET(new Request('http://x'))).json()).toEqual({ name: 'a' });
  });

  it('413s a chunked body without content-length before buffering it all', async () => {
    const { route, sign } = await setup();
    const POST = route({
      auth: 'user',
      input: z.object({}).passthrough(),
      output: z.object({}),
      handler: async () => ({}),
    });
    const chunk = new TextEncoder().encode('x'.repeat(8 * 1024));
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 100) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await sign(USER)}` },
      body,
      duplex: 'half',
    } as RequestInit);
    expect((await POST(req)).status).toBe(413);
    expect(pulled).toBeLessThan(10);
  });

  it('throttles repeated failed authentication per IP', async () => {
    const { route } = await setup();
    const GET = route({
      auth: 'user',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    });
    const statuses: number[] = [];
    for (let i = 0; i < AUTH_FAILURE_LIMIT.limit + 1; i++) {
      const res = await GET(new Request('http://x', { headers: { authorization: 'Bearer nope' } }));
      statuses.push(res.status);
    }
    expect(statuses.at(0)).toBe(401);
    expect(statuses.at(-1)).toBe(429);
  });

  it('reads repeated query keys as arrays for GET routes', async () => {
    const { route } = await setup();
    const GET = route({
      auth: 'public',
      input: z.object({ tag: z.array(z.string()), limit: z.coerce.number().int() }),
      output: z.object({ tag: z.array(z.string()), limit: z.number() }),
      handler: async ({ input }) => input,
    });
    const res = await GET(new Request('http://x?tag=a&tag=b&limit=5'));
    expect(await res.json()).toEqual({ tag: ['a', 'b'], limit: 5 });
  });

  it('validates route params and 400s bad ones', async () => {
    const { route } = await setup();
    const GET = route({
      auth: 'public',
      input: z.object({}),
      params: z.object({ id: z.uuid() }),
      output: z.object({ id: z.string() }),
      handler: async ({ params }) => ({ id: params.id }),
    });
    const ok = await GET(new Request('http://x'), { params: Promise.resolve({ id: USER }) });
    expect(await ok.json()).toEqual({ id: USER });
    const bad = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'nope' }) });
    expect(bad.status).toBe(400);
  });

  it('503s a route whose flag is off and serves it when on', async () => {
    const off = await setup({ flags: { 'x.y': false } });
    const on = await setup({ flags: { 'x.y': true } });
    const opts = {
      auth: 'public' as const,
      flag: 'x.y',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    };
    const offRes = await off.route(opts)(new Request('http://x'));
    expect(offRes.status).toBe(503);
    expect((await offRes.json()).error.code).toBe('disabled');
    expect((await on.route(opts)(new Request('http://x'))).status).toBe(200);
  });

  it('authenticates before consulting a kill switch', async () => {
    const isFlagEnabled = vi.fn(async () => false);
    const POST = createRouteFactory({
      resolveUser: async () => null,
      isAdmin: async () => false,
      isFlagEnabled,
      rateLimiter: createMemoryRateLimiter(),
      clientIp: () => '203.0.113.9',
      logger: { error: vi.fn() },
    })({
      auth: 'user',
      flag: 'x.y',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    });
    expect((await POST(post({}))).status).toBe(401);
    expect(isFlagEnabled).not.toHaveBeenCalled();
  });

  it('426s native builds older than the minimum version', async () => {
    const { route } = await setup({ minAppVersion: '1.4.0' });
    const GET = route({
      auth: 'public',
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    });
    const req = (v: string) => new Request('http://x', { headers: { 'x-robes-app-version': v } });
    expect((await GET(req('1.3.9'))).status).toBe(426);
    expect((await GET(req('1.4.0'))).status).toBe(200);
    expect((await GET(new Request('http://x'))).status).toBe(200);
  });
});
