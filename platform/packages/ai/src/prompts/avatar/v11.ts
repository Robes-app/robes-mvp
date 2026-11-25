import * as v10 from './v10';

// v11 (a tester's look, 25 Nov): bare legs in thong sandals under a sheer black skirt, and when she
// swapped jackets the redraw gave her black footless tights. Every outfit prompt allowed "nothing
// extra beyond simple essentials" and never said what an essential was, so the model added what it
// thought the outfit needed. v11 says "nothing extra" and spells it out straight after the garment
// list: no legwear, belt, scarf, hat, jewellery, bag or layer that is not listed, legs bare under a
// skirt, and plain shoes only when the look has none (the framing asks for both feet). A prompt for
// one piece on her base layer never had the clause and is v10's to the letter.
export * from './v10';
export const VERSION = 11;

export type RenderPiece = v10.RenderPiece;

const ESSENTIALS = 'nothing extra beyond simple essentials';

const SHOE_WORDS =
  /\b(shoes?|boots?|booties|sandals?|trainers?|sneakers?|loafers?|heels|pumps|mules?|flats|slippers?|clogs?|brogues?|espadrilles?|slingbacks?)\b/i;

export function hasShoes(pieces: readonly RenderPiece[]): boolean {
  return pieces.some((p) => p.category === 'Shoes' || SHOE_WORDS.test(p.name));
}

export function nothingUnlisted(gender: 'woman' | 'man', shoes: boolean): string {
  const her = gender === 'man' ? 'his' : 'her';
  const legs =
    gender === 'man'
      ? 'below shorts his legs are bare'
      : 'below a skirt, dress or shorts her legs are bare';
  const feet = shoes
    ? ''
    : ` The one exception: no shoes are listed, so give ${gender === 'man' ? 'him' : 'her'} plain, simple shoes in a quiet neutral.`;
  return `NOTHING UNLISTED: ${her} outfit is exactly the listed pieces. No tights, stockings, leggings or socks unless one is listed — ${legs}, and in open shoes ${her} feet are bare. No belt, scarf, hat, jewellery, bag or extra layer unless it is listed.${feet}`;
}

// The essentials clause made exact: "nothing extra", then the rule after the garment list (after
// the LAYERS line when there is one).
export function nothingExtra(
  prompt: string,
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
): string {
  if (!prompt.includes(ESSENTIALS)) return prompt;
  const lines = prompt.replace(ESSENTIALS, 'nothing extra').split('\n');
  const at = lines.flatMap((l, i) => (l.startsWith('- ') ? [i] : [])).slice(0, pieces.length);
  if (at.length !== pieces.length) throw new Error('avatar v11: the garment list moved');
  let after = at[at.length - 1] as number;
  if (lines[after + 1]?.startsWith('LAYERS')) after += 1;
  lines.splice(after + 1, 0, nothingUnlisted(gender, hasShoes(pieces)));
  return lines.join('\n');
}

export function buildFrameRenderPrompt(
  ...args: Parameters<typeof v10.buildFrameRenderPrompt>
): string {
  return nothingExtra(v10.buildFrameRenderPrompt(...args), args[0], args[1]);
}

export function buildRenderPrompt(...args: Parameters<typeof v10.buildRenderPrompt>): string {
  return nothingExtra(v10.buildRenderPrompt(...args), args[0], args[1]);
}
