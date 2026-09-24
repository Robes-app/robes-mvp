import { createHash } from 'node:crypto';
import { MODEL_REGISTRY } from './models';
import { solidPng } from './png';
import { AiError, type AiProvider, type JsonRequest, type Usage } from './provider';

// Deterministic, offline stand-in (dev, tests, CI). Each feature registers a fixture that
// returns schema-valid output for a request; images are soft flat-colour PNGs.
export type FakeFixture = (req: JsonRequest<unknown>) => unknown;

const SWATCHES: Array<[number, number, number]> = [
  [239, 233, 220],
  [212, 200, 196],
  [184, 150, 157],
  [169, 166, 126],
  [216, 207, 192],
];

function hash(value: string): number {
  return createHash('sha256').update(value).digest().readUInt32BE(0);
}

function fakeUsage(model: string, family: string, images = 0): Usage {
  return { model, family, tokensIn: 0, tokensOut: 0, images, costMicros: 0, latencyMs: 0 };
}

export function createFakeProvider(fixtures: Record<string, FakeFixture> = {}): AiProvider {
  return {
    name: 'fake',

    async generateJson(req) {
      if (req.signal.aborted) throw new AiError('cancelled');
      const fixture = fixtures[req.feature];
      if (!fixture) throw new AiError('provider');
      const spec = MODEL_REGISTRY[req.capability];
      const data = req.schema.safeParse(fixture(req as JsonRequest<unknown>));
      if (!data.success) throw new AiError('invalid_output');
      return { data: data.data, usage: fakeUsage(`fake:${spec.model}`, spec.family) };
    },

    async generateImage(req) {
      if (req.signal.aborted) throw new AiError('cancelled');
      const spec = MODEL_REGISTRY[req.capability];
      const [w, h] =
        req.aspectRatio === '1:1'
          ? [800, 800]
          : req.aspectRatio === '3:4'
            ? [768, 1024]
            : [800, 1000];
      const colour = SWATCHES[hash(req.prompt) % SWATCHES.length] ?? [239, 233, 220];
      return {
        image: { mimeType: 'image/png', data: solidPng(w, h, colour) },
        usage: fakeUsage(`fake:${spec.model}`, spec.family, 1),
      };
    },
  };
}
