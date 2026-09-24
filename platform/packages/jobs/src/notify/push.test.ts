import { describe, expect, it, vi } from 'vitest';
import { composePush, createExpoPushSender, EXPO_PUSH_URL } from './push';
import { composeEmail } from './tick';

const msg = (to: string) => ({ to, title: 't', body: 'b', data: { url: 'robes://plan' } });

describe('Expo push sender', () => {
  it('sends in batches of 100 with the access token', async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const n = (JSON.parse(String(init?.body)) as unknown[]).length;
      return new Response(JSON.stringify({ data: Array(n).fill({ status: 'ok' }) }));
    });
    const sender = createExpoPushSender({ accessToken: 'tok', fetch: fetch as never });
    await sender.send(Array.from({ length: 250 }, (_, i) => msg(`ExponentPushToken[${i}]`)));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0]?.[0]).toBe(EXPO_PUSH_URL);
    const headers = (fetch.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers.authorization).toBe('Bearer tok');
    expect((JSON.parse(String(fetch.mock.calls[2]?.[1]?.body)) as unknown[]).length).toBe(50);
  });

  it('reports DeviceNotRegistered tokens and fails without leaking the provider body', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              { status: 'ok' },
              { status: 'error', details: { error: 'DeviceNotRegistered' } },
              { status: 'error', details: { error: 'MessageRateExceeded' } },
            ],
          }),
        ),
    );
    const sender = createExpoPushSender({ fetch: fetch as never });
    const out = await sender.send([msg('a'), msg('b'), msg('c')]);
    expect(out.deadTokens).toEqual(['b']);
    const failing = createExpoPushSender({
      fetch: (async () => new Response('secret detail', { status: 500 })) as never,
    });
    await expect(failing.send([msg('a')])).rejects.toThrow('push send failed (500)');
  });

  it('deep links each kind to its screen', () => {
    const ready = composePush({
      kind: 'looks_ready',
      ref: 'i1',
      pref: 'looksReady',
      ideaId: 'i1',
      piece: 'camel coat',
    });
    expect(ready).toMatchObject({
      body: expect.stringMatching(/^Camel coat/),
      data: { url: 'robes://looks/ideas/i1' },
    });
    const morning = composePush({
      kind: 'morning',
      ref: '2026-09-24',
      pref: 'morningCue',
      date: '2026-09-24',
      weekday: 'Thursday',
      title: 'Board meeting',
      look: 'Gallery',
    });
    expect(morning).toEqual({
      title: 'Thursday · Board meeting',
      body: 'Wearing Gallery.',
      data: { url: 'robes://plan' },
    });
  });
});

describe('overnight morning cue', () => {
  const mail = {
    kind: 'morning' as const,
    ref: '2026-09-24',
    pref: 'morningCue' as const,
    date: '2026-09-24',
    weekday: 'Thursday',
    title: 'Linen and loafers',
    look: null,
    dailyLookId: '11111111-1111-4111-8111-111111111111',
  };

  it('opens the overnight look from push and email', () => {
    expect(composePush(mail).data.url).toBe(`robes://today/looks/${mail.dailyLookId}`);
    const email = composeEmail(
      { appUrl: 'https://app.test', unsubSecret: 'x'.repeat(40) },
      { id: '22222222-2222-4222-8222-222222222222', email: 'niall@test.dev' },
      mail,
    );
    expect(email.subject).toBe('Thursday · Linen and loafers');
    expect(email.text).toContain(`https://app.test/today/looks/${mail.dailyLookId}?from=email`);
    expect(email.text).toContain('Robes dressed you for today.');
  });
});
