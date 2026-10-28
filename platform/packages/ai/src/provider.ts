import type { z } from 'zod';
import type { ImageCapability, ImageSize, TextCapability } from './models';

export interface InlineImage {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: Uint8Array;
}

export interface Usage {
  model: string;
  family: string;
  tokensIn: number;
  tokensOut: number;
  images: number;
  costMicros: number;
  latencyMs: number;
}

export interface JsonRequest<T> {
  // Names the prompt module for the ledger, evals and fakes (e.g. 'wardrobe.analyse').
  feature: string;
  capability: TextCapability;
  system: string;
  user: string;
  images?: InlineImage[];
  schema: z.ZodType<T>;
  maxOutputTokens: number;
  temperature?: number;
  // A judgement that earns more reasoning and the photo at full detail (her colour read). Every
  // other call keeps the defaults: low thinking (billed as output), and a photo read is filing.
  deliberate?: boolean;
  signal: AbortSignal;
}

export interface ImageRequest {
  feature: string;
  capability: ImageCapability;
  prompt: string;
  references?: InlineImage[];
  aspectRatio: '4:5' | '1:1' | '3:4';
  // 1K unless asked: 2K only where a face must survive a full-length frame (her twin).
  imageSize?: ImageSize;
  signal: AbortSignal;
}

export interface AiProvider {
  readonly name: 'gemini' | 'fake';
  generateJson<T>(req: JsonRequest<T>): Promise<{ data: T; usage: Usage }>;
  generateImage(req: ImageRequest): Promise<{ image: InlineImage; usage: Usage }>;
}

export type AiErrorCode = 'timeout' | 'cancelled' | 'invalid_output' | 'blocked' | 'provider';

// Carries a short code only; provider text never leaves this package (SEC-31).
export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    readonly usage?: Usage,
  ) {
    super(`ai_${code}`);
  }
}
