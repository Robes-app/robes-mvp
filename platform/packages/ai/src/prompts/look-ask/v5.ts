import { z } from 'zod';
import * as v4 from './v4';

// v5 (docked look prompt PRD M5, 18 Nov). "Adjust model image" leaves the photo, so the prompt is
// the one place she asks for a change, the picture included. Until now a note about the whole
// photograph ("a different pose", "outdoors", "warmer light") had no intent: it read as a swap or
// a question. v5 adds intent "picture": her note in a few words, for the client to send to the
// look's picture note (D21) and redraw. Nothing on the rack changes. How ONE piece is worn stays
// "styled". Everything else is v4's, byte for byte: only the sentence named in REPLACED changes.
export * from './v4';
export const VERSION = 5;

export const INTENTS = [
  'swap',
  'back',
  'rule',
  'styled',
  'clarify',
  'draft',
  'none',
  'picture',
] as const;
export type Intent = (typeof INTENTS)[number];

const PICTURE_MAX = 240;

export const Output = v4.Output.extend({
  picture: z.string().max(400).default(''),
});
export type Output = z.infer<typeof Output>;

export interface Answer extends Omit<v4.Answer, 'intent'> {
  intent: Intent;
  // Her note about the whole photograph, for the look's picture note; '' unless "picture".
  picture: string;
}

const UNUSED_ADDS =
  'Unused fields: "swaps" [], "adds" [], "back" [], "styled" [], "draft" "", "rule" "".';
const UNUSED_PICTURE =
  'Unused fields: "swaps" [], "adds" [], "back" [], "styled" [], "draft" "", "rule" "", "picture" "".';

// The v4 sentence this version replaces; the test holds that it is still found.
export const REPLACED = [UNUSED_ADDS] as const;

export function buildSystem(ctx: v4.AskContext): string {
  return `${v4.buildSystem(ctx).replace(UNUSED_ADDS, UNUSED_PICTURE)}

THE PICTURE ITSELF: when her words are about the photograph and name no piece — the pose, the setting or backdrop, the light, the framing, her expression ("a different pose", "outdoors", "warmer light", "show the whole outfit", "smiling") — intent "picture". "picture" is her note in a few plain words, as she would say it ("a different pose, walking"). Nothing on the look changes: "swaps", "adds", "back", "styled" stay empty, "reply" is "" and "follow_up" is "". A note about how ONE piece is worn is "styled", never "picture".`;
}

const clip = (v: string | null | undefined, n: number) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

export function normaliseAnswer(out: Output, ctx: Pick<v4.AskContext, 'rack' | 'pool'>): Answer {
  const picture = out.intent === 'picture' ? clip(out.picture, PICTURE_MAX) : '';
  if (picture) {
    // A picture note changes nothing on the rack, so nothing of v4's answer rides with it.
    const none = v4.normaliseAnswer({ ...out, intent: 'none', reply: '' }, ctx);
    return { ...none, intent: 'picture', reply: '', followUp: '', picture };
  }
  // A "picture" with no note is nothing changed; Robes' words, if any, stand.
  const intent = out.intent === 'picture' ? 'none' : out.intent;
  return { ...v4.normaliseAnswer({ ...out, intent }, ctx), picture: '' };
}

// Offline fixture: v4's; words about the pose, setting or light come back as a picture note, so
// the flow runs without a key.
export function fakeOutput(system: string, user: string): Output {
  const said = (/She says: <user_input>\n([\s\S]*?)\n<\/user_input>/.exec(user)?.[1] ?? '').trim();
  if (/\b(pose|outdoors|backdrop|background|light|lighting|smil\w*)\b/i.test(said)) {
    return {
      intent: 'picture',
      reply: '',
      swaps: [],
      adds: [],
      back: [],
      styled: [],
      draft: '',
      rule: '',
      follow_up: '',
      picture: said.slice(0, 120),
    };
  }
  return { ...v4.fakeOutput(system, user), picture: '' };
}
