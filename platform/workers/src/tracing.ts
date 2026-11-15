import {
  createGenerationTracer,
  createPostHogClient,
  type TraceShare,
} from '@robes/analytics/server';
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

// Mirrors each model call a job records to PostHog LLM analytics, after the ledger has it. What
// leaves is hers to decide (`shares`): nothing, the numbers, or the numbers with what Robes asked
// and its answer. Off unless POSTHOG_KEY is set.
export function tracedLedger(
  ledger: Ledger,
  shares: (userId: string) => Promise<TraceShare>,
): Ledger {
  const config = process.env.POSTHOG_KEY ? parseEnv(workerErrorEnv, process.env) : undefined;
  if (!config) return ledger;
  const tracer = createGenerationTracer({
    client: createPostHogClient(config.key, config.host),
    shares,
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
        ...(call.prompt || call.response !== undefined
          ? { text: { input: call.prompt, output: call.response } }
          : {}),
      });
    },
  };
}

// Her answers decide: Share my looks with Robes sends the words, with or without usage counts;
// usage counts alone send the numbers. The team's own accounts share their words with usage
// counts on, so looks can be analysed before anyone else is asked.
export function traceShare(
  answers: { analytics?: boolean; look_sharing?: boolean },
  isAdmin: boolean,
): TraceShare {
  if (answers.look_sharing === true) return 'text';
  if (answers.analytics !== true) return 'none';
  return isAdmin ? 'text' : 'numbers';
}
