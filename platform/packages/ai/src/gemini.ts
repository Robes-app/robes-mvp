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
            responseJsonSchema: z.toJSONSchema(req.schema),
            maxOutputTokens: req.maxOutputTokens,
            temperature: req.temperature ?? 0.4,
            // Thinking is billed as output; styling JSON doesn't need it (cost lever 5).
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...(req.capability === 'vision.analyse'
              ? { mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM }
              : {}),
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
            imageConfig: { aspectRatio: req.aspectRatio, imageSize: '1K' },
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
          costMicros: imageCostMicros(spec, tokensIn, part ? 1 : 0),
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
