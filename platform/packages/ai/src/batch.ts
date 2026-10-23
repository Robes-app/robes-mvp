import { createHash } from 'node:crypto';
import { GoogleGenAI, JobState, ThinkingLevel } from '@google/genai';
import type { z } from 'zod';
import type { FakeFixture } from './fake';
import { geminiSchema } from './gemini';
import { MODEL_REGISTRY, type TextCapability, textCostMicros } from './models';
import type { JsonRequest, Usage } from './provider';

// Gemini Batch API (cost lever 4): the same JSON prompts at half price, answered within hours.
// Used for the overnight Today look; the interactive provider remains the fallback.
export const BATCH_DISCOUNT = 0.5;

export interface BatchTextRequest {
  // Caller's id for the request (a job id); results come back keyed by it.
  key: string;
  system: string;
  user: string;
  maxOutputTokens: number;
  temperature?: number;
}

export interface BatchSubmit {
  feature: string;
  capability: TextCapability;
  schema: z.ZodType;
  requests: BatchTextRequest[];
}

export interface BatchResult {
  key: string;
  // Raw model text (JSON); null when that request failed or was blocked.
  text: string | null;
  usage: Usage | null;
}

export type BatchPoll =
  | { state: 'running' }
  | { state: 'failed' }
  | { state: 'succeeded'; results: BatchResult[] };

export interface BatchProvider {
  readonly name: 'gemini' | 'fake';
  submit(req: BatchSubmit): Promise<{ batchId: string }>;
  poll(batchId: string, keys: readonly string[]): Promise<BatchPoll>;
}

// Model output is validated like user input (SEC-30); anything unparseable is null.
export function parseBatchResult<T>(schema: z.ZodType<T>, result: BatchResult): T | null {
  if (!result.text) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(result.text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type Batches = Pick<GoogleGenAI['batches'], 'create' | 'get'>;

const FAILED = new Set<string>([
  JobState.JOB_STATE_FAILED,
  JobState.JOB_STATE_CANCELLED,
  JobState.JOB_STATE_EXPIRED,
]);

// `batches` is injectable so the adapter is testable without network.
export function createGeminiBatchProvider(
  opts: { apiKey: string } | { batches: Batches },
): BatchProvider {
  const batches: Batches =
    'batches' in opts ? opts.batches : new GoogleGenAI({ apiKey: opts.apiKey }).batches;

  return {
    name: 'gemini',

    async submit(req) {
      const spec = MODEL_REGISTRY[req.capability];
      const schema = geminiSchema(req.schema);
      const job = await batches.create({
        model: spec.model,
        src: req.requests.map((r) => ({
          contents: [{ role: 'user', parts: [{ text: r.user }] }],
          config: {
            systemInstruction: r.system,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            maxOutputTokens: r.maxOutputTokens,
            temperature: r.temperature ?? 0.4,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
          metadata: { key: r.key },
        })),
        config: { displayName: `robes-${req.feature}` },
      });
      if (!job.name) throw new Error('batch submit returned no name');
      // The capability rides in the id so results are priced by the same spec in a later process.
      return { batchId: `${req.capability}|${job.name}` };
    },

    async poll(batchId) {
      const [capability, name] = batchId.split('|') as [TextCapability, string];
      const spec = MODEL_REGISTRY[capability] ?? MODEL_REGISTRY['text.fast'];
      const job = await batches.get({ name });
      if (job.state && FAILED.has(job.state)) return { state: 'failed' };
      if (job.state !== JobState.JOB_STATE_SUCCEEDED) return { state: 'running' };
      const results = (job.dest?.inlinedResponses ?? []).flatMap((r): BatchResult[] => {
        const key = r.metadata?.key;
        if (!key) return [];
        const meta = r.response?.usageMetadata;
        const tokensIn = meta?.promptTokenCount ?? 0;
        const tokensOut = (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0);
        return [
          {
            key,
            text: r.error ? null : (r.response?.text ?? null),
            usage: r.response
              ? {
                  model: spec.model,
                  family: spec.family,
                  tokensIn,
                  tokensOut,
                  images: 0,
                  costMicros: Math.round(
                    textCostMicros(spec, tokensIn, tokensOut) * BATCH_DISCOUNT,
                  ),
                  latencyMs: 0,
                }
              : null,
          },
        ];
      });
      return { state: 'succeeded', results };
    },
  };
}

// Offline stand-in: every batch "finishes" on its first poll with the feature's fixture output.
// Requests are remembered in-process so fixtures see the real prompt when submit and poll share one.
export function createFakeBatchProvider(fixtures: Record<string, FakeFixture> = {}): BatchProvider {
  const submitted = new Map<string, Map<string, BatchTextRequest>>();
  return {
    name: 'fake',
    async submit(req) {
      const digest = createHash('sha256')
        .update(req.requests.map((r) => r.key).join(','))
        .digest('hex')
        .slice(0, 16);
      const batchId = `fake|${req.feature}|${req.capability}|${digest}`;
      submitted.set(batchId, new Map(req.requests.map((r) => [r.key, r])));
      return { batchId };
    },
    async poll(batchId, keys) {
      const [, feature = '', capability = 'text.fast'] = batchId.split('|');
      const fixture = fixtures[feature];
      if (!fixture) return { state: 'failed' };
      const spec = MODEL_REGISTRY[capability as TextCapability] ?? MODEL_REGISTRY['text.fast'];
      return {
        state: 'succeeded',
        results: keys.map((key) => ({
          key,
          text: JSON.stringify(
            fixture({
              feature,
              capability,
              system: submitted.get(batchId)?.get(key)?.system ?? '',
              user: submitted.get(batchId)?.get(key)?.user ?? '',
            } as JsonRequest<unknown>),
          ),
          usage: {
            model: `fake:${spec.model}`,
            family: spec.family,
            tokensIn: 0,
            tokensOut: 0,
            images: 0,
            costMicros: 0,
            latencyMs: 0,
          },
        })),
      };
    },
  };
}
