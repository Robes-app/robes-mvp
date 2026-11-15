import { createGenerationTracer, createPostHogClient } from '@robes/analytics/server';
import { parseEnv, workerErrorEnv } from '@robes/config';
import type { CallRecord, SystemRepositories } from '@robes/db';

type Ledger = SystemRepositories['ledger'];

function checksOf(detail: CallRecord['detail']): Record<string, number | boolean> | undefined {
  const checks = detail?.checks;
  if (!checks || typeof checks !== 'object') return undefined;
  const kept = Object.entries(checks).filter(
    (e): e is [string, number | boolean] => typeof e[1] === 'number' || typeof e[1] === 'boolean',
  );
  return kept.length ? Object.fromEntries(kept) : undefined;
}

// Mirrors each model call a job records to PostHog LLM analytics (numbers and ids only), after
// the ledger has it and only with her analytics consent. Off unless POSTHOG_KEY is set.
export function tracedLedger(
  ledger: Ledger,
  hasConsent: (userId: string) => Promise<boolean>,
): Ledger {
  const config = process.env.POSTHOG_KEY ? parseEnv(workerErrorEnv, process.env) : undefined;
  if (!config) return ledger;
  const tracer = createGenerationTracer({
    client: createPostHogClient(config.key, config.host),
    hasConsent,
    environment: config.environment,
  });
  return {
    ...ledger,
    async record(call) {
      await ledger.record(call);
      if (!call.userId || !call.jobId) return;
      const checks = checksOf(call.detail);
      await tracer.record(call.userId, {
        traceId: call.jobId,
        feature: call.feature,
        provider: 'google',
        model: call.model,
        tokensIn: call.tokensIn,
        tokensOut: call.tokensOut,
        images: call.images,
        latencyMs: call.latencyMs,
        costMicros: call.costMicros,
        status: call.status,
        ...(checks ? { checks } : {}),
      });
    },
  };
}
