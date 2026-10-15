import {
  type AiProvider,
  type BatchProvider,
  createAiProvider,
  createBatchProvider,
  type FakeFixture,
} from '@robes/ai';
import * as daily from '@robes/ai/prompts/daily';
import * as lookAsk from '@robes/ai/prompts/look-ask';
import * as receiptRead from '@robes/ai/prompts/receipt-read';
import * as styleAnalyse from '@robes/ai/prompts/style-analyse';
import * as styleBrief from '@robes/ai/prompts/style-brief';
import * as stylePiece from '@robes/ai/prompts/style-piece';
import * as travel from '@robes/ai/prompts/travel';
import * as wardrobeAnalyse from '@robes/ai/prompts/wardrobe-analyse';

// Every prompt module's offline fixture, so dev without a Gemini key runs every job end to end.
const FAKE_FIXTURES: Record<string, FakeFixture> = {
  [wardrobeAnalyse.FEATURE]: () => wardrobeAnalyse.fakeOutput(),
  // Owned pieces by index when the prompt lists a closet (counts the numbered closet lines).
  [daily.FEATURE]: (req) => daily.fakeOutput((req.system.match(/^\d+: /gm) ?? []).length),
  // Plans are the system prompt's "- label" lines under HER PLANS; the closet is indexed lines.
  [travel.FEATURE]: (req) =>
    travel.fakeOutput(
      /HER PLANS[^\n]*\n((?:- .*\n)+)/
        .exec(req.system)?.[1]
        ?.trim()
        .split('\n')
        .map((l) => l.slice(2)) ?? [],
      (req.system.match(/^\d+: /gm) ?? []).length,
    ),
  [receiptRead.FEATURE]: () => receiptRead.fakeOutput(),
  [styleAnalyse.COLOUR_FEATURE]: () => styleAnalyse.fakeColour(),
  [styleAnalyse.SILHOUETTE_FEATURE]: () => styleAnalyse.fakeSilhouette(),
  [styleBrief.FEATURE]: () => styleBrief.fakeOutput(),
  // The piece or her words from the user turn; owned pieces from the numbered closet.
  [stylePiece.FEATURE]: (req) =>
    stylePiece.fakeOutput({
      label:
        /(?:The key piece: |in her words: )<user_input>\n(.*)\n/.exec(req.user)?.[1] ??
        'Your piece',
      closetSize: (/HER WARDROBE[^\n]*/.exec(req.system)?.[0].match(/\[\d+\] /g) ?? []).length,
      refine: req.user.includes('HER ADJUSTMENT'),
      dressMe: req.system.includes('She is dressing for a real day'),
    }),
  [lookAsk.FEATURE]: (req) => lookAsk.fakeOutput(req.system, req.user),
};

export function createJobAi(opts: {
  appEnv: 'dev' | 'staging' | 'production';
  geminiApiKey?: string | undefined;
}): AiProvider {
  return createAiProvider({ ...opts, fixtures: FAKE_FIXTURES });
}

// The Batch API counterpart (overnight Today look); the same offline fixtures in dev.
export function createJobBatch(opts: {
  appEnv: 'dev' | 'staging' | 'production';
  geminiApiKey?: string | undefined;
}): BatchProvider {
  return createBatchProvider({ ...opts, fixtures: FAKE_FIXTURES });
}
