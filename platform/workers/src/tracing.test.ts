import { afterEach, describe, expect, it, vi } from 'vitest';

const captureImmediate = vi.fn(async (_message: { event: string; properties: unknown }) => {});
vi.mock('@robes/analytics/server', async (real) => ({
  ...(await real<typeof import('@robes/analytics/server')>()),
  createPostHogClient: () => ({ captureImmediate }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  captureImmediate.mockClear();
});

const call = {
  jobId: 'job-1',
  userId: 'u1',
  feature: 'style.piece',
  model: 'gemini-3.1-flash-lite',
  family: 'gemini-flash-lite',
  tokensIn: 10,
  tokensOut: 5,
  images: 0,
  latencyMs: 1000,
  status: 'ok' as const,
  costMicros: 3,
  prompt: 'her words',
  response: { ways: [] },
  detail: { balance: 'owned', checks: { complete: true, note: 'never sent' } },
};

function ledger() {
  return { record: vi.fn(async () => {}), isExhausted: vi.fn(async () => false) };
}

describe('traced ledger', () => {
  it('is the ledger itself without a key', async () => {
    vi.stubEnv('APP_ENV', 'dev');
    vi.stubEnv('POSTHOG_KEY', '');
    const { tracedLedger } = await import('./tracing');
    const inner = ledger();
    expect(
      tracedLedger(
        inner,
        async () => true,
        async () => true,
      ),
    ).toBe(inner);
  });

  it('records first, then mirrors the call without its prompt, answer or words', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('POSTHOG_KEY', 'phc_w');
    const { tracedLedger } = await import('./tracing');
    const inner = ledger();
    await tracedLedger(
      inner,
      async () => true,
      async () => false,
    ).record(call);
    expect(inner.record).toHaveBeenCalledWith(call);
    expect(captureImmediate.mock.calls.map(([m]) => m.event)).toEqual([
      '$ai_generation',
      '$ai_metric',
    ]);
    const sent = JSON.stringify(captureImmediate.mock.calls);
    expect(sent).toContain('"$ai_trace_id":"job-1"');
    expect(sent).not.toMatch(/her words|ways|never sent|owned/);
  });

  it('mirrors nothing for a call outside a job, or without her consent', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('POSTHOG_KEY', 'phc_w');
    const { tracedLedger } = await import('./tracing');
    await tracedLedger(
      ledger(),
      async () => true,
      async () => true,
    ).record({
      ...call,
      jobId: undefined,
    });
    await tracedLedger(
      ledger(),
      async () => false,
      async () => true,
    ).record(call);
    expect(captureImmediate).not.toHaveBeenCalled();
  });

  it('sends the prompt and its answer for a team account, and still never the detail', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('POSTHOG_KEY', 'phc_w');
    const { tracedLedger } = await import('./tracing');
    await tracedLedger(
      ledger(),
      async () => true,
      async () => true,
    ).record(call);
    const sent = JSON.stringify(captureImmediate.mock.calls[0]);
    expect(sent).toContain('"$ai_input":[{"role":"user","content":"her words"}]');
    expect(sent).toContain('$ai_output_choices');
    expect(sent).not.toMatch(/never sent/);
  });
});
