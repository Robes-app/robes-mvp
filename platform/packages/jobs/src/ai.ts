import { type AiProvider, createAiProvider, type FakeFixture } from '@robes/ai';
import * as wardrobeAnalyse from '@robes/ai/prompts/wardrobe-analyse';

// Every prompt module's offline fixture, so dev without a Gemini key runs every job end to end.
const FAKE_FIXTURES: Record<string, FakeFixture> = {
  [wardrobeAnalyse.FEATURE]: () => wardrobeAnalyse.fakeOutput(),
};

export function createJobAi(opts: {
  appEnv: 'dev' | 'staging' | 'production';
  geminiApiKey?: string | undefined;
}): AiProvider {
  return createAiProvider({ ...opts, fixtures: FAKE_FIXTURES });
}
