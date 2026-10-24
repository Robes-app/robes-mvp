import { afterEach, describe, expect, it, vi } from 'vitest';

const captureExceptionImmediate = vi.fn(async () => {});
vi.mock('@robes/analytics/server', async (real) => ({
  ...(await real<typeof import('@robes/analytics/server')>()),
  createPostHogClient: () => ({ captureExceptionImmediate }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  captureExceptionImmediate.mockClear();
});

describe('worker error reporting', () => {
  it('leaves handlers untouched without a key', async () => {
    vi.stubEnv('APP_ENV', 'dev');
    vi.stubEnv('POSTHOG_KEY', '');
    const { withErrorReporting } = await import('./errors');
    const handler = async () => 'ok';
    expect(withErrorReporting(handler)).toBe(handler);
  });

  it('reports a failure with the environment and rethrows it', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('POSTHOG_KEY', 'phc_w');
    vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'robes-staging-generate');
    const { withErrorReporting } = await import('./errors');
    const err = new Error('boom');
    const wrapped = withErrorReporting(async () => {
      throw err;
    });
    await expect(wrapped()).rejects.toBe(err);
    expect(captureExceptionImmediate).toHaveBeenCalledWith(err, undefined, {
      source: 'worker',
      worker: 'robes-staging-generate',
      environment: 'staging',
    });
    expect(await withErrorReporting(async () => 'ok')()).toBe('ok');
  });
});
