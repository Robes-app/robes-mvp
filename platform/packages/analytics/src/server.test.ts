import { describe, expect, it, vi } from 'vitest';
import { createServerAnalytics, type ServerAnalyticsClient } from './server';

function setup(consented: boolean) {
  const client = {
    captureImmediate: vi.fn(async () => {}),
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
    await smuggle('u1', 'job_started', { kind: 'fake', email: 'ann@example.com', name: 'Ann' });
    await smuggle('u1', 'onboarding_completed', { $set: { email: 'ann@example.com' } });
    expect(client.captureImmediate).toHaveBeenCalledTimes(1);
    expect(client.captureImmediate).toHaveBeenCalledWith({
      distinctId: 'u1',
      event: 'job_started',
      properties: { kind: 'fake', $process_person_profile: false },
      disableGeoip: true,
    });
    expect(JSON.stringify(client.captureImmediate.mock.calls)).not.toMatch(/ann|Ann/);
  });

  it('sends nothing for a user without analytics consent', async () => {
    const { client, hasConsent, analytics } = setup(false);
    await analytics.capture('u2', 'onboarding_completed');
    expect(hasConsent).toHaveBeenCalledWith('u2');
    expect(client.captureImmediate).not.toHaveBeenCalled();
  });
});
