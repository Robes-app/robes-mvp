import { GoogleGenAI, MediaResolution, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { imageCostMicros, MODEL_REGISTRY, textCostMicros } from './models';
import { AiError, type AiProvider, type InlineImage, type Usage } from './provider';

type Models = Pick<GoogleGenAI['models'], 'generateContent'>;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function imagePart(image: InlineImage) {
  return { inlineData: { mimeType: image.mimeType, data: toBase64(image.data) } };
}

// Gemini answers 400 INVALID_ARGUMENT to `maxItems` on arrays of objects (every styling,
// receipt and pieces schema), so the cap is left out of what it sees; zod still enforces it.
export function geminiSchema(schema: z.ZodType): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (!node || typeof node !== 'object') return node;
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => key !== 'maxItems')
        .map(([key, value]) => [key, strip(value)]),
    );
  };
  return strip(z.toJSONSchema(schema));
}

function mapError(err: unknown, signal: AbortSignal): AiError {
  if (err instanceof AiError) return err;
  if (signal.aborted) {
    return new AiError(
      signal.reason instanceof Error && signal.reason.name === 'TimeoutError'
        ? 'timeout'
        : 'cancelled',
    );
  }
  return new AiError('provider');
}

// Gemini via @google/genai. `models` is injectable so the adapter is testable without network.
export function createGeminiProvider(opts: { apiKey: string } | { models: Models }): AiProvider {
  const models: Models =
    'models' in opts ? opts.models : new GoogleGenAI({ apiKey: opts.apiKey }).models;

  return {
    name: 'gemini',

    async generateJson(req) {
      const spec = MODEL_REGISTRY[req.capability];
      const started = Date.now();
      try {
        const res = await models.generateContent({
          model: spec.model,
          contents: [
            { role: 'user', parts: [...(req.images ?? []).map(imagePart), { text: req.user }] },
          ],
          config: {
            systemInstruction: req.system,
            responseMimeType: 'application/json',
            responseJsonSchema: geminiSchema(req.schema),
            maxOutputTokens: req.maxOutputTokens,
            temperature: req.temperature ?? 0.4,
            // Thinking is billed as output; styling JSON doesn't need it (cost lever 5). A photo
            // read is filing, not reasoning: minimal thinking, and full resolution so a small
            // label (the brand, the composition) and a fine print can be read.
            ...(req.deliberate
              ? {
                  thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
                  ...(req.images?.length
                    ? { mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH }
                    : {}),
                }
              : req.capability === 'vision.analyse'
                ? {
                    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                    mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
                  }
                : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
            abortSignal: req.signal,
          },
        });
        const meta = res.usageMetadata;
        const tokensIn = meta?.promptTokenCount ?? 0;
        const tokensOut = (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0);
        const usage: Usage = {
          model: spec.model,
          family: spec.family,
          tokensIn,
          tokensOut,
          images: 0,
          costMicros: textCostMicros(spec, tokensIn, tokensOut),
          latencyMs: Date.now() - started,
        };
        if (!res.text) throw new AiError('blocked', usage);
        let parsed: unknown;
        try {
          parsed = JSON.parse(res.text);
        } catch {
          throw new AiError('invalid_output', usage);
        }
        // Model output is validated like user input (SEC-30).
        const data = req.schema.safeParse(parsed);
        if (!data.success) throw new AiError('invalid_output', usage);
        return { data: data.data, usage };
      } catch (err) {
        throw mapError(err, req.signal);
      }
    },

    async generateImage(req) {
      const spec = MODEL_REGISTRY[req.capability];
      const started = Date.now();
      try {
        const res = await models.generateContent({
          model: spec.model,
          contents: [
            {
              role: 'user',
              parts: [...(req.references ?? []).map(imagePart), { text: req.prompt }],
            },
          ],
          config: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: req.aspectRatio, imageSize: req.imageSize ?? '1K' },
            abortSignal: req.signal,
          },
        });
        const tokensIn = res.usageMetadata?.promptTokenCount ?? 0;
        const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        const usage: Usage = {
          model: spec.model,
          family: spec.family,
          tokensIn,
          tokensOut: 0,
          images: part ? 1 : 0,
          costMicros: imageCostMicros(spec, tokensIn, part ? 1 : 0, req.imageSize),
          latencyMs: Date.now() - started,
        };
        const data = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;
        if (
          !data ||
          (mimeType !== 'image/png' && mimeType !== 'image/jpeg' && mimeType !== 'image/webp')
        ) {
          throw new AiError('blocked', usage);
        }
        return { image: { mimeType, data: new Uint8Array(Buffer.from(data, 'base64')) }, usage };
      } catch (err) {
        throw mapError(err, req.signal);
      }
    },
  };
}
