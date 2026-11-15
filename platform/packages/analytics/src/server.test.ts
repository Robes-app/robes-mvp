import { describe, expect, it, vi } from 'vitest';
import {
  createErrorReporter,
  createGenerationTracer,
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

describe('generation tracer', () => {
  const call = {
    traceId: 'job-1',
    feature: 'style.piece',
    provider: 'google',
    model: 'gemini-3.1-flash-lite',
    tokensIn: 1200,
    tokensOut: 300,
    images: 0,
    latencyMs: 2500,
    costMicros: 750,
    status: 'ok' as const,
  };
  function tracer(share: 'none' | 'numbers' | 'text') {
    const { client } = setup(true);
    return {
      client,
      tracer: createGenerationTracer({ client, shares: async () => share, environment: 'staging' }),
    };
  }

  it('sends one generation and a metric per check, with numbers and ids only', async () => {
    const { client, tracer: t } = tracer('numbers');
    await t.record('u1', {
      ...call,
      checks: { complete: true, label_mismatch: 1 },
      text: { input: 'her words', output: { ways: [] } },
    });
    expect((client.captureImmediate.mock.calls as unknown[][]).map((c) => c[0])).toEqual([
      {
        distinctId: 'u1',
        event: '$ai_generation',
        properties: {
          $ai_trace_id: 'job-1',
          $process_person_profile: false,
          environment: 'staging',
          $ai_span_name: 'style.piece',
          $ai_provider: 'google',
          $ai_model: 'gemini-3.1-flash-lite',
          $ai_input_tokens: 1200,
          $ai_output_tokens: 300,
          $ai_latency: 2.5,
          $ai_total_cost_usd: 0.00075,
          $ai_is_error: false,
          status: 'ok',
          images: 0,
        },
        disableGeoip: true,
      },
      expect.objectContaining({
        event: '$ai_metric',
        properties: expect.objectContaining({
          $ai_trace_id: 'job-1',
          $ai_metric_name: 'style.piece.complete',
          $ai_metric_value: 'true',
        }),
      }),
      expect.objectContaining({
        properties: expect.objectContaining({
          $ai_metric_name: 'style.piece.label_mismatch',
          $ai_metric_value: '1',
        }),
      }),
    ]);
  });

  it('sends nothing when she shares nothing', async () => {
    const { client, tracer: t } = tracer('none');
    await t.record('u2', { ...call, text: { input: 'her words' } });
    expect(client.captureImmediate).not.toHaveBeenCalled();
  });

  it('sends what Robes asked and its answer only when she shares her looks', async () => {
    const { client, tracer: t } = tracer('text');
    await t.record('u3', { ...call, text: { input: 'her words', output: { ways: [] } } });
    expect(client.captureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          $ai_input: [{ role: 'user', content: 'her words' }],
          $ai_output_choices: [{ role: 'assistant', content: '{"ways":[]}' }],
        }),
      }),
    );
  });

  it('never throws when PostHog is down', async () => {
    const { client, tracer: t } = tracer('numbers');
    client.captureImmediate.mockRejectedValueOnce(new Error('down'));
    await expect(t.record('u1', { ...call, status: 'timeout' })).resolves.toBeUndefined();
  });
});
