import { describe, expect, it } from 'vitest';
import { sentryOptions } from './sentry-options';

describe('sentryOptions', () => {
  const options = sentryOptions({
    dsn: 'https://k@o1.ingest.de.sentry.io/2',
    environment: 'staging',
    release: 'abc123',
    tracesSampleRate: 0.1,
  });

  it('never sends default PII and tags release and environment', () => {
    expect(options).toMatchObject({
      sendDefaultPii: false,
      environment: 'staging',
      release: 'abc123',
      tracesSampleRate: 0.1,
    });
  });

  it('redacts emails and prompts in beforeSend', () => {
    const event = options.beforeSend({
      message: 'failed for ann@example.com',
      extra: { prompt: 'a red dress for my wedding' },
      user: { id: 'u1', email: 'ann@example.com' },
    });
    const json = JSON.stringify(event);
    expect(json).not.toContain('ann@example.com');
    expect(json).not.toContain('red dress');
    expect(event.user).toEqual({ id: 'u1' });
  });

  it('strips query strings from breadcrumbs', () => {
    expect(
      options.beforeBreadcrumb({ category: 'fetch', data: { url: '/api/v1/me?email=a@b.co' } }),
    ).toEqual({ category: 'fetch', data: { url: '/api/v1/me' } });
  });
});
