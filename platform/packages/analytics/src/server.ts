import { PostHog } from 'posthog-node';
import { type EventName, type PropsArg, parseEvent } from './events';

export interface ServerAnalyticsClient {
  captureImmediate(message: {
    distinctId: string;
    event: string;
    properties: Record<string, unknown>;
    disableGeoip?: boolean;
  }): Promise<void>;
  captureExceptionImmediate(
    error: unknown,
    distinctId?: string,
    properties?: Record<string, unknown>,
  ): Promise<void>;
  shutdown(): Promise<void>;
}

export interface ServerAnalytics {
  // Keyed by user id only; sends nothing unless that user has granted analytics consent.
  capture<E extends EventName>(userId: string, event: E, ...props: PropsArg<E>): Promise<void>;
  shutdown(): Promise<void>;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// SEC-83: an error message can carry an address; strip it before it leaves the server.
export function scrubExceptions<E extends { properties?: Record<string, unknown> }>(
  event: E | null,
) {
  const list = event?.properties?.$exception_list;
  if (Array.isArray(list)) {
    for (const ex of list) {
      if (ex && typeof ex.value === 'string') ex.value = ex.value.replace(EMAIL, '[redacted]');
    }
  }
  return event;
}

export function createPostHogClient(key: string, host: string): ServerAnalyticsClient {
  return new PostHog(key, {
    host,
    flushAt: 1,
    flushInterval: 0,
    disableGeoip: true,
    before_send: scrubExceptions,
  });
}

export interface ErrorReporter {
  // Anonymous (no person): reports reach PostHog error tracking whatever her consent, like logs.
  capture(error: unknown, properties?: Record<string, unknown>): Promise<void>;
}

export function createErrorReporter(
  client: ServerAnalyticsClient,
  environment: string,
): ErrorReporter {
  return {
    async capture(error, properties) {
      await client
        .captureExceptionImmediate(error, undefined, { ...properties, environment })
        .catch(() => undefined);
    },
  };
}

export const noopErrorReporter: ErrorReporter = { async capture() {} };

export function createServerAnalytics(deps: {
  client: ServerAnalyticsClient;
  hasConsent(userId: string): Promise<boolean>;
}): ServerAnalytics {
  return {
    async capture(userId, event, ...[props]) {
      const parsed = parseEvent(event, props);
      if (!parsed.ok || !(await deps.hasConsent(userId))) return;
      // Only the validated catalogue props: no email, name or person properties ever.
      await deps.client.captureImmediate({
        distinctId: userId,
        event: parsed.event,
        properties: { ...parsed.properties, $process_person_profile: false },
        disableGeoip: true,
      });
    },
    shutdown: () => deps.client.shutdown(),
  };
}

// What of a model call may leave for PostHog, by her own answers: nothing, the numbers (usage
// counts), or the numbers with what Robes asked and its answer (Share my looks with Robes).
export type TraceShare = 'none' | 'numbers' | 'text';

// One model call as PostHog LLM analytics reads it: numbers, enums and ids, and `text` when the
// ledger kept it. The tracer drops `text` unless she shares it.
export interface GenerationTrace {
  // Every call made for one job shares its id, so PostHog groups them as one trace.
  traceId: string;
  feature: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  images: number;
  latencyMs: number;
  costMicros: number;
  status: 'ok' | 'partial' | 'timeout' | 'error' | 'cancelled';
  // What code checked of the answer (`detail.checks` on the ledger): each becomes a trace metric.
  checks?: Record<string, number | boolean>;
  // What Robes asked and its answer: sent only at share level 'text'.
  text?: { input?: string | undefined; output?: unknown };
}

export interface GenerationTracer {
  // Sends what `shares` allows for that user, nothing at 'none'; never throws.
  record(userId: string, call: GenerationTrace): Promise<void>;
}

export function createGenerationTracer(deps: {
  client: ServerAnalyticsClient;
  shares(userId: string): Promise<TraceShare>;
  environment: string;
}): GenerationTracer {
  return {
    async record(userId, call) {
      try {
        const share = await deps.shares(userId);
        if (share === 'none') return;
        const text = share === 'text' ? call.text : undefined;
        const base = {
          $ai_trace_id: call.traceId,
          $process_person_profile: false,
          environment: deps.environment,
        };
        await deps.client.captureImmediate({
          distinctId: userId,
          event: '$ai_generation',
          properties: {
            ...base,
            $ai_span_name: call.feature,
            $ai_provider: call.provider,
            $ai_model: call.model,
            $ai_input_tokens: call.tokensIn,
            $ai_output_tokens: call.tokensOut,
            $ai_latency: call.latencyMs / 1000,
            $ai_total_cost_usd: call.costMicros / 1_000_000,
            $ai_is_error: call.status === 'error' || call.status === 'timeout',
            status: call.status,
            images: call.images,
            ...(text?.input ? { $ai_input: [{ role: 'user', content: text.input }] } : {}),
            ...(text?.output !== undefined
              ? {
                  $ai_output_choices: [{ role: 'assistant', content: JSON.stringify(text.output) }],
                }
              : {}),
          },
          disableGeoip: true,
        });
        for (const [name, value] of Object.entries(call.checks ?? {})) {
          await deps.client.captureImmediate({
            distinctId: userId,
            event: '$ai_metric',
            properties: {
              ...base,
              $ai_metric_name: `${call.feature}.${name}`,
              $ai_metric_value: String(value),
            },
            disableGeoip: true,
          });
        }
      } catch {
        // Tracing must never fail the job it describes.
      }
    },
  };
}

export const noopServerAnalytics: ServerAnalytics = {
  async capture() {},
  async shutdown() {},
};
