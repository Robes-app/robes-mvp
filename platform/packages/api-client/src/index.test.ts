import { readQuery } from '@robes/api';
import { errors } from '@robes/copy';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  ApiClientError,
  buildPath,
  createApiClient,
  IDEMPOTENCY_HEADER,
  serializeQuery,
} from './index';

const JOB_ID = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';
const me = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ann@test.dev',
  firstName: 'Ann',
  lastName: null,
  instagramHandle: null,
  locale: 'en-IE',
  timezone: 'Europe/Dublin',
  currency: 'EUR',
  homeCity: null,
  onboarded: true,
  notifications: { looksReady: true, morningCue: true, nudges: false, receipts: true },
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function setup(
  responses: Array<Response | Error>,
  extra: Parameters<typeof createApiClient>[0] = { baseUrl: 'https://api.test' },
) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => {});
  const client = createApiClient({ ...extra, fetch, sleep });
  const headersOf = (i: number) =>
    (fetch.mock.calls[i]?.[1]?.headers ?? {}) as Record<string, string>;
  return { client, fetch, sleep, headersOf };
}

describe('call', () => {
  it('returns the parsed output and strips undeclared fields', async () => {
    const { client, fetch, headersOf } = setup([json({ ...me, secret: 'x' })]);
    const out = await client.call('me.get');
    expect(out).toEqual(me);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/me');
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('GET');
    expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(headersOf(0)).toMatchObject({ accept: 'application/json' });
  });

  it('sends JSON bodies, app version, credentials and injected headers', async () => {
    const { client, fetch, headersOf } = setup([json(me)], {
      baseUrl: 'https://api.test/',
      appVersion: '1.2.3',
      credentials: 'omit',
      headers: async () => ({ cookie: 'robes.session=abc' }),
    });
    await client.call('me.update', { input: { firstName: 'Ann' } });
    const init = fetch.mock.calls[0]?.[1];
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/me');
    expect(init?.method).toBe('PATCH');
    expect(init?.body).toBe('{"firstName":"Ann"}');
    expect(init?.credentials).toBe('omit');
    expect(headersOf(0)).toMatchObject({
      'content-type': 'application/json',
      'x-robes-app-version': '1.2.3',
      cookie: 'robes.session=abc',
    });
  });

  it('maps an ErrorBody to ApiClientError with request id and Retry-After', async () => {
    const { client } = setup([
      json({ error: { code: 'rate_limited', message: 'Slow down', requestId: 'req-1' } }, 429, {
        'retry-after': '12',
      }),
    ]);
    const err = await client.call('me.get').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({
      status: 429,
      code: 'rate_limited',
      message: 'Slow down',
      requestId: 'req-1',
      retryAfter: 12,
    });
  });

  it('maps unknown or invalid error bodies to internal', async () => {
    const { client } = setup([
      new Response('<html>bad gateway</html>', { status: 400, headers: { 'x-request-id': 'r2' } }),
      json({ error: { code: 'teapot', message: 'x', requestId: 'r' } }, 418),
    ]);
    const first = await client.call('me.get').catch((e: unknown) => e);
    expect(first).toMatchObject({ status: 400, code: 'internal', requestId: 'r2' });
    expect((first as Error).message).toBe(errors.internal);
    const second = await client.call('me.get').catch((e: unknown) => e);
    expect(second).toMatchObject({ status: 418, code: 'internal', retryAfter: null });
  });

  it('treats a success body that breaks the contract as internal', async () => {
    const { client } = setup([json({ id: 'nope' })]);
    await expect(client.call('me.get')).rejects.toMatchObject({ code: 'internal', status: 200 });
  });

  it('reports network failures on non-retryable calls as status 0', async () => {
    const { client, fetch } = setup([new TypeError('offline')]);
    const err = (await client
      .call('me.update', { input: {} })
      .catch((e: unknown) => e)) as ApiClientError;
    expect(err.isNetwork).toBe(true);
    expect(err.code).toBe('internal');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('idempotency', () => {
  it('adds a key on idempotent routes and reuses it across retries', async () => {
    const started = { jobId: JOB_ID, status: 'queued' };
    const { client, fetch, sleep, headersOf } = setup([
      new TypeError('network'),
      json({ error: { code: 'capacity', message: 'busy', requestId: 'r' } }, 503),
      json(started, 202),
    ]);
    await expect(client.call('jobs.fake')).resolves.toEqual(started);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    const key = headersOf(0)[IDEMPOTENCY_HEADER];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(headersOf(1)[IDEMPOTENCY_HEADER]).toBe(key);
    expect(headersOf(2)[IDEMPOTENCY_HEADER]).toBe(key);
  });

  it('uses a fresh key per call and honours an explicit one', async () => {
    const started = { jobId: JOB_ID, status: 'queued' };
    const { client, headersOf } = setup([
      json(started, 202),
      json(started, 202),
      json(started, 202),
    ]);
    await client.call('jobs.fake');
    await client.call('jobs.fake');
    await client.call('jobs.fake', { idempotencyKey: 'fixed-key' });
    expect(headersOf(0)[IDEMPOTENCY_HEADER]).not.toBe(headersOf(1)[IDEMPOTENCY_HEADER]);
    expect(headersOf(2)[IDEMPOTENCY_HEADER]).toBe('fixed-key');
  });

  it('sends no key and never retries non-idempotent writes', async () => {
    const { client, fetch, headersOf } = setup([
      json({ error: { code: 'capacity', message: 'busy', requestId: 'r' } }, 503),
    ]);
    await expect(client.call('me.onboarding.complete')).rejects.toMatchObject({ code: 'capacity' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(headersOf(0)[IDEMPOTENCY_HEADER]).toBeUndefined();
  });

  it('does not retry kill switches or client errors', async () => {
    const { client, fetch } = setup([
      json({ error: { code: 'disabled', message: 'paused', requestId: 'r' } }, 503),
    ]);
    await expect(client.call('jobs.fake')).rejects.toMatchObject({ code: 'disabled' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after the retry budget', async () => {
    const { client, fetch } = setup([new TypeError('a'), new TypeError('b'), new TypeError('c')]);
    await expect(client.call('me.get')).rejects.toMatchObject({ status: 0 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe('paths and queries', () => {
  it('interpolates and encodes params', async () => {
    expect(buildPath('/jobs/:id/cancel', { id: JOB_ID })).toBe(`/jobs/${JOB_ID}/cancel`);
    expect(buildPath('/things/:id', { id: 'a/b c?' })).toBe('/things/a%2Fb%20c%3F');
    expect(() => buildPath('/jobs/:id', {})).toThrow(/Missing route param "id"/);
    const { client, fetch } = setup([json({ id: JOB_ID, kind: 'x' }, 200)]);
    await client.call('jobs.get', { params: { id: JOB_ID } }).catch(() => {});
    expect(fetch.mock.calls[0]?.[0]).toBe(`https://api.test/api/v1/jobs/${JOB_ID}`);
    expect(client.url('jobs.events', { id: JOB_ID })).toBe(
      `https://api.test/api/v1/jobs/${JOB_ID}/events`,
    );
  });

  it('serialises queries exactly as the server reads them', () => {
    const cases: Array<[Record<string, unknown>, Record<string, string | string[]>]> = [
      [{}, {}],
      [
        { limit: 20, cursor: 'abc' },
        { limit: '20', cursor: 'abc' },
      ],
      [{ type: ['look', 'trip'] }, { type: ['look', 'trip'] }],
      [{ type: ['look'] }, { type: 'look' }],
      [
        { on: true, off: false, skip: undefined, none: null },
        { on: 'true', off: 'false' },
      ],
      [
        { q: 'a&b=c d/é', empty: '' },
        { q: 'a&b=c d/é', empty: '' },
      ],
      [{ from: new Date('2026-09-24T00:00:00.000Z') }, { from: '2026-09-24T00:00:00.000Z' }],
    ];
    for (const [input, expected] of cases) {
      expect(readQuery(`http://x/api/v1/things${serializeQuery(input)}`)).toEqual(expected);
    }
  });

  it('puts GET input in the query string, not the body', async () => {
    const { client, fetch } = setup([json({ ok: true })]);
    await client.call('health.get', { input: {} });
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/health');
  });
});

describe('types', () => {
  it('requires params and input where the contract does', () => {
    const client = createApiClient({ baseUrl: '', fetch: async () => json({}) });
    const never = () => {
      // @ts-expect-error params are required for /jobs/:id
      void client.call('jobs.get');
      // @ts-expect-error SSE routes are opened with openEvents, not called
      void client.call('jobs.events', { params: { id: JOB_ID } });
      // @ts-expect-error the upload body is required
      void client.call('uploads.create');
      // @ts-expect-error unknown fields are rejected
      void client.call('me.update', { input: { onboardedAt: 'x' } });
    };
    expect(typeof never).toBe('function');
    expectTypeOf(client.call<'me.get'>).returns.resolves.toHaveProperty('firstName');
  });
});
