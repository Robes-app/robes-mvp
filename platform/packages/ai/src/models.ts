// Capability → model registry. Call sites ask for a capability, never a model id, so a model
// change is a config edit validated by evals (infrastructure.md §6). Prices verified 2026-09-24
// (cost-research.md §4.1); USD per 1M tokens equals micro-dollars per token.
export const TEXT_CAPABILITIES = ['text.fast', 'text.reasoning', 'vision.analyse'] as const;
export const IMAGE_CAPABILITIES = ['image.hero', 'image.secondary'] as const;
export type TextCapability = (typeof TEXT_CAPABILITIES)[number];
export type ImageCapability = (typeof IMAGE_CAPABILITIES)[number];
export type Capability = TextCapability | ImageCapability;

export interface TextModelSpec {
  kind: 'text';
  model: string;
  family: string;
  inputPerMTok: number;
  outputPerMTok: number;
}

export interface ImageModelSpec {
  kind: 'image';
  model: string;
  family: string;
  inputPerMTok: number;
  // Per image at the 1K tier; we never request 2K/4K (cost lever 1).
  perImageMicros: number;
}

export const MODEL_REGISTRY: Record<TextCapability, TextModelSpec> &
  Record<ImageCapability, ImageModelSpec> = {
  'text.fast': {
    kind: 'text',
    model: 'gemini-3.1-flash-lite',
    family: 'gemini-flash-lite',
    inputPerMTok: 0.25,
    outputPerMTok: 1.5,
  },
  // Price doubles on 2027-01-01; re-evaluate against text.fast with evals before then.
  'text.reasoning': {
    kind: 'text',
    model: 'gemini-3.8-flash',
    family: 'gemini-flash',
    inputPerMTok: 0.75,
    outputPerMTok: 3.75,
  },
  'vision.analyse': {
    kind: 'text',
    model: 'gemini-3.1-flash-lite',
    family: 'gemini-flash-lite',
    inputPerMTok: 0.25,
    outputPerMTok: 1.5,
  },
  'image.hero': {
    kind: 'image',
    model: 'gemini-3.1-flash-image',
    family: 'gemini-image',
    inputPerMTok: 0.5,
    perImageMicros: 67_000,
  },
  'image.secondary': {
    kind: 'image',
    model: 'gemini-3.1-flash-lite-image',
    family: 'gemini-image-lite',
    inputPerMTok: 0.25,
    perImageMicros: 33_600,
  },
};

export function textCostMicros(spec: TextModelSpec, tokensIn: number, tokensOut: number): number {
  return Math.round(tokensIn * spec.inputPerMTok + tokensOut * spec.outputPerMTok);
}

export function imageCostMicros(spec: ImageModelSpec, tokensIn: number, images: number): number {
  return Math.round(tokensIn * spec.inputPerMTok + images * spec.perImageMicros);
}
