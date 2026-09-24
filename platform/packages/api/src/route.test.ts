import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ISSUER, makeKeys } from '../test/keys';
import { createJwtVerifier } from './auth';
import { createMemoryRateLimiter } from './rate-limit';
import { createRouteFactory } from './route';

const USER = '11111111-1111-4111-8111-111111111111';

async function setup(opts: { admins?: string[] } = {}) {
  const { getKey, sign } = await makeKeys();
  const logger = { error: vi.fn() };
  const route = createRouteFactory({
    verifier: createJwtVerifier({ getKey, issuer: ISSUER }),
    isAdmin: async (id) => (opts.admins ?? []).includes(id),
    rateLimiter: createMemoryRateLimiter(),
    clientIp: () => '203.0.113.9',
    logger,
    validateOutput: true,
  });
  return { route, sign, logger };
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

  it('hides internal errors behind a generic message and logs them', async () => {
    const { route, logger } = await setup();
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
});
