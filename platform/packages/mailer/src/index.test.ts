import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMailer, createMemoryMailer } from './index';

describe('mailer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('records mail in memory', async () => {
    const mailer = createMemoryMailer();
    await mailer.send({ to: 'a@b.co', subject: 'Hi', text: 'Hello' });
    expect(mailer.sent).toEqual([{ to: 'a@b.co', subject: 'Hi', text: 'Hello' }]);
  });

  it('sends through Resend without leaking the provider response', async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"message":"secret detail"}', { status: 422 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const mailer = createMailer({
      transport: 'resend',
      apiKey: 'k',
      from: 'Robes <hi@byrobes.com>',
    });
    await expect(mailer.send({ to: 'a@b.co', subject: 'Hi', text: 'x' })).rejects.toThrow(
      'email send failed (422)',
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
