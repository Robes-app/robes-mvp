import { type BatchProvider, createFakeBatchProvider, createGeminiBatchProvider } from './batch';
import { createFakeProvider, type FakeFixture } from './fake';
import { createGeminiProvider } from './gemini';
import type { AiProvider } from './provider';

export * from './batch';
export * from './fake';
export * from './fence';
export * from './gemini';
export * from './models';
export * from './provider';

// Gemini when a key is configured; the offline fake only in dev/test — never silently in prod.
export function createAiProvider(opts: {
  appEnv: 'dev' | 'staging' | 'production';
  geminiApiKey?: string | undefined;
  fixtures?: Record<string, FakeFixture>;
}): AiProvider {
  if (opts.geminiApiKey) return createGeminiProvider({ apiKey: opts.geminiApiKey });
  if (opts.appEnv !== 'dev') throw new Error('GEMINI_API_KEY is required outside dev');
  return createFakeProvider(opts.fixtures);
}

// Same rule as createAiProvider: the batch fake only ever runs in dev/test.
export function createBatchProvider(opts: {
  appEnv: 'dev' | 'staging' | 'production';
  geminiApiKey?: string | undefined;
  fixtures?: Record<string, FakeFixture>;
}): BatchProvider {
  if (opts.geminiApiKey) return createGeminiBatchProvider({ apiKey: opts.geminiApiKey });
  if (opts.appEnv !== 'dev') throw new Error('GEMINI_API_KEY is required outside dev');
  return createFakeBatchProvider(opts.fixtures);
}
