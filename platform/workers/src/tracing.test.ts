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
  return {
    record: vi.fn(async () => {}),
    featureCost: vi.fn(async () => ({ calls: 0, avgMicros: 0, maxMicros: 0 })),
    isExhausted: vi.fn(async () => false),
  };
}

describe('traced ledger', () => {
  it('is the ledger itself without a key', async () => {
    vi.stubEnv('APP_ENV', 'dev');
    vi.stubEnv('POSTHOG_KEY', '');
    const { tracedLedger } = await import('./tracing');
    const inner = ledger();
    expect(tracedLedger(inner, async () => 'text')).toBe(inner);
  });

  it('records first, then mirrors the call without its prompt, answer or words', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('POSTHOG_KEY', 'phc_w');
    const { tracedLedger } = await import('./tracing');
    const inner = ledger();
    await tracedLedger(inner, async () => 'numbers').record(call);
    expect(inner.record).toHaveBeenCalledWith(call);
    expect(captureImmediate.mock.calls.map(([m]) => m.event)).toEqual([
      '$ai_generation',
      '$ai_metric',
    ]);
    const sent = JSON.stringify(captureImmediate.mock.calls);
    expect(sent).toContain('"$ai_trace_id":"job-1"');
    expect(sent).not.toMatch(/her words|ways|never sent|owned/);
  });

  it('mirrors nothing for a call outside a job, or when she shares nothing', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('POSTHOG_KEY', 'phc_w');
    const { tracedLedger } = await import('./tracing');
    await tracedLedger(ledger(), async () => 'text').record({
      ...call,
      jobId: undefined,
    });
    await tracedLedger(ledger(), async () => 'none').record(call);
    expect(captureImmediate).not.toHaveBeenCalled();
  });

  it('sends the prompt and its answer when she shares her looks, and still never the detail', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('POSTHOG_KEY', 'phc_w');
    const { tracedLedger } = await import('./tracing');
    await tracedLedger(ledger(), async () => 'text').record(call);
    const sent = JSON.stringify(captureImmediate.mock.calls[0]);
    expect(sent).toContain('"$ai_input":[{"role":"user","content":"her words"}]');
    expect(sent).toContain('$ai_output_choices');
    expect(sent).not.toMatch(/never sent/);
  });

  it('reads what may leave from her answers', async () => {
    const { traceShare } = await import('./tracing');
    expect(traceShare({}, false)).toBe('none');
    expect(traceShare({ analytics: false }, true)).toBe('none');
    expect(traceShare({ analytics: true }, false)).toBe('numbers');
    expect(traceShare({ analytics: true }, true)).toBe('text');
    // Her yes to sharing looks stands without usage counts; turning it off stops the words.
    expect(traceShare({ look_sharing: true }, false)).toBe('text');
    expect(traceShare({ analytics: true, look_sharing: false }, false)).toBe('numbers');
  });
});
