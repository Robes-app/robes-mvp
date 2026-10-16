import { JobState } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  BATCH_DISCOUNT,
  createFakeBatchProvider,
  createGeminiBatchProvider,
  parseBatchResult,
} from './batch';
import { MODEL_REGISTRY, textCostMicros } from './models';

const Schema = z.object({ headline: z.string() });
const submit = {
  feature: 'today.daily',
  capability: 'text.fast' as const,
  schema: Schema,
  requests: [
    { key: 'job-a', system: 'sys', user: 'brief a', maxOutputTokens: 100 },
    { key: 'job-b', system: 'sys', user: 'brief b', maxOutputTokens: 100 },
  ],
};

describe('Gemini batch provider', () => {
  it('submits inline requests keyed by metadata and maps results back at half price', async () => {
    const create = vi.fn(async () => ({ name: 'batches/123' }));
    const get = vi.fn(async () => ({
      state: JobState.JOB_STATE_SUCCEEDED,
      dest: {
        inlinedResponses: [
          {
            metadata: { key: 'job-a' },
            response: {
              text: '{"headline":"Linen day"}',
              usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 },
            },
          },
          { metadata: { key: 'job-b' }, error: { message: 'blocked' } },
        ],
      },
    }));
    const provider = createGeminiBatchProvider({ batches: { create, get } as never });
    const { batchId } = await provider.submit(submit);
    const call = (create.mock.calls[0] as unknown[])[0] as {
      model: string;
      src: Array<{ metadata: { key: string }; config: { systemInstruction: string } }>;
    };
    expect(call.model).toBe(MODEL_REGISTRY['text.fast'].model);
    expect(call.src.map((r) => r.metadata.key)).toEqual(['job-a', 'job-b']);

    const polled = await provider.poll(batchId, ['job-a', 'job-b']);
    expect(get).toHaveBeenCalledWith({ name: 'batches/123' });
    if (polled.state !== 'succeeded') throw new Error('expected success');
    const [a, b] = polled.results;
    expect(parseBatchResult(Schema, a ?? { key: '', text: null, usage: null })).toEqual({
      headline: 'Linen day',
    });
    expect(a?.usage?.costMicros).toBe(
      Math.round(textCostMicros(MODEL_REGISTRY['text.fast'], 1000, 200) * BATCH_DISCOUNT),
    );
    expect(b?.text).toBeNull();
  });

  it('reports running and failed states', async () => {
    const create = vi.fn(async () => ({ name: 'batches/9' }));
    let state = JobState.JOB_STATE_RUNNING;
    const provider = createGeminiBatchProvider({
      batches: { create, get: vi.fn(async () => ({ state })) } as never,
    });
    const { batchId } = await provider.submit(submit);
    expect(await provider.poll(batchId, [])).toEqual({ state: 'running' });
    state = JobState.JOB_STATE_EXPIRED;
    expect(await provider.poll(batchId, [])).toEqual({ state: 'failed' });
  });
});

describe('fake batch provider', () => {
  it('finishes on first poll with the fixture for every key', async () => {
    const provider = createFakeBatchProvider({ 'today.daily': () => ({ headline: 'Fake day' }) });
    const { batchId } = await provider.submit(submit);
    const polled = await provider.poll(batchId, ['job-a', 'job-b']);
    if (polled.state !== 'succeeded') throw new Error('expected success');
    expect(polled.results.map((r) => parseBatchResult(Schema, r))).toEqual([
      { headline: 'Fake day' },
      { headline: 'Fake day' },
    ]);
    expect(await createFakeBatchProvider().poll(batchId, ['x'])).toEqual({ state: 'failed' });
  });

  it('rejects output that does not match the schema', () => {
    expect(parseBatchResult(Schema, { key: 'k', text: '{"nope":1}', usage: null })).toBeNull();
    expect(parseBatchResult(Schema, { key: 'k', text: 'not json', usage: null })).toBeNull();
  });
});
