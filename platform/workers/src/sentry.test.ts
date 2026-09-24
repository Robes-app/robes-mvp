import { afterEach, describe, expect, it, vi } from 'vitest';

const init = vi.fn();
const wrapHandler = vi.fn((h: unknown) => h);
vi.mock('@sentry/aws-serverless', () => ({ init, wrapHandler }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  init.mockClear();
  wrapHandler.mockClear();
});

describe('worker Sentry', () => {
  it('stays off and leaves handlers untouched without a DSN', async () => {
    vi.stubEnv('SENTRY_DSN', '');
    const { withSentry, sentryEnabled } = await import('./sentry');
    const handler = async () => 'ok';
    expect(sentryEnabled).toBe(false);
    expect(withSentry(handler)).toBe(handler);
    expect(init).not.toHaveBeenCalled();
  });

  it('initialises without PII and scrubs events when a DSN is set', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('SENTRY_DSN', 'https://k@o1.ingest.de.sentry.io/2');
    vi.stubEnv('SENTRY_RELEASE', 'sha1');
    const { withSentry } = await import('./sentry');
    withSentry(async () => 'ok');
    expect(wrapHandler).toHaveBeenCalledOnce();
    const options = init.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      environment: 'staging',
      release: 'sha1',
      sendDefaultPii: false,
    });
    const event = options.beforeSend({ extra: { prompt: 'a red dress' }, message: 'x@y.co' });
    expect(JSON.stringify(event)).not.toMatch(/red dress|x@y\.co/);
  });
});
