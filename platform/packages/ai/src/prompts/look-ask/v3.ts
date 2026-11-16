import * as v2 from './v2';

// v3 (prompt box redline, 14 Nov, pin 26): Robes speaks to her directly. v1 had it answer about
// itself in the third person ("Robes would change both") and open an applied change with "Done.";
// on the look's own prompt a change is seen, not told, so what Robes says is short, first person
// and to her. Everything else is v2's, byte for byte: only the voice sentences are replaced.
export * from './v2';
export const VERSION = 3;

const THIRD_PERSON =
  'You answer in sentences, as Robes, in the third person ("Robes would change both"). Never "I", never "AI", never "assistant".';
const DIRECT =
  'You answer in sentences, as Robes, speaking to her directly: "I" for yourself and "you" for her ("I can\'t see high heels in your wardrobe. The taupe mesh flats are the closest refined shoe."). Never speak of Robes or of her in the third person, never "AI", never "assistant".';
const HER_FLATS = '"her black pointed flats"';
const YOUR_FLATS = '"your black pointed flats"';
const LEAD_DONE = 'Lead an applied change with "Done." then what is on the look now.';
const NO_DONE =
  'Never open with "Done." and never list what you did: for an applied change say, at most, what is on the look now in one short sentence.';

// The three v1 sentences this version replaces; the test holds that each is still found.
export const REPLACED = [THIRD_PERSON, HER_FLATS, LEAD_DONE] as const;

export function buildSystem(ctx: v2.AskContext): string {
  return v2
    .buildSystem(ctx)
    .replace(THIRD_PERSON, DIRECT)
    .replace(HER_FLATS, YOUR_FLATS)
    .replace(LEAD_DONE, NO_DONE);
}
