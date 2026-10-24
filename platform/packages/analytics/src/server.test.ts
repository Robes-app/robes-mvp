import { describe, expect, it, vi } from 'vitest';
import {
  createErrorReporter,
  createServerAnalytics,
  type ServerAnalyticsClient,
  scrubExceptions,
} from './server';

function setup(consented: boolean) {
  const client = {
    captureImmediate: vi.fn(async () => {}),
    captureExceptionImmediate: vi.fn(async () => {}),
    shutdown: vi.fn(async () => {}),
  } satisfies ServerAnalyticsClient;
  const hasConsent = vi.fn(async () => consented);
  return { client, hasConsent, analytics: createServerAnalytics({ client, hasConsent }) };
}

describe('server analytics', () => {
  it('keys events by user id and never sends email or name', async () => {
    const { client, analytics } = setup(true);
    await analytics.capture('u1', 'job_started', { kind: 'fake' });
    const smuggle = analytics.capture as (u: string, e: string, p: unknown) => Promise<void>;
    await smuggle('u1', 'job_started', { kind: 'fake', email: 'niall@example.com', name: 'Niall' });
    await smuggle('u1', 'onboarding_completed', { $set: { email: 'niall@example.com' } });
    expect(client.captureImmediate).toHaveBeenCalledTimes(1);
    expect(client.captureImmediate).toHaveBeenCalledWith({
      distinctId: 'u1',
      event: 'job_started',
      properties: { kind: 'fake', $process_person_profile: false },
      disableGeoip: true,
    });
    expect(JSON.stringify(client.captureImmediate.mock.calls)).not.toMatch(/ann|Niall/);
  });

  it('sends nothing for a user without analytics consent', async () => {
    const { client, hasConsent, analytics } = setup(false);
    await analytics.capture('u2', 'onboarding_completed');
    expect(hasConsent).toHaveBeenCalledWith('u2');
    expect(client.captureImmediate).not.toHaveBeenCalled();
  });
});

describe('error reporter', () => {
  it('reports anonymously with the environment and never throws', async () => {
    const { client } = setup(false);
    const reporter = createErrorReporter(client, 'staging');
    const err = new Error('boom');
    await reporter.capture(err, { requestId: 'r1' });
    expect(client.captureExceptionImmediate).toHaveBeenCalledWith(err, undefined, {
      requestId: 'r1',
      environment: 'staging',
    });
    client.captureExceptionImmediate.mockRejectedValueOnce(new Error('offline'));
    await expect(reporter.capture(err)).resolves.toBeUndefined();
  });
});

it('strips email addresses from exception messages (SEC-83)', () => {
  const event = { properties: { $exception_list: [{ value: 'no user niall@example.com' }] } };
  expect(scrubExceptions(event)?.properties.$exception_list[0]?.value).toBe('no user [redacted]');
  expect(scrubExceptions(null)).toBeNull();
});
