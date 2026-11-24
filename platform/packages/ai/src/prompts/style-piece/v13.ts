import { fenceUserText } from '../../fence';
import type { AroundPiece } from './v6';
import * as v12 from './v12';

// v13 (Style a piece → draft look, handoff 24 Nov): she starts from one piece of hers on its page
// and asks for a look built around it. The prompt box's words carry the brief as before; the piece
// rides as THE KEY PIECE, with its photo attached, so the model sees what it is styling. A wish
// she is thinking of buying rides the same way (Annie, 24 Nov), styled with what she owns so she
// sees whether it earns its place. The handler still puts the piece on the rack when the answer
// leaves it out. Everything else is v12's.
export * from './v12';
export const VERSION = 13;

type V12Ask = Parameters<typeof v12.buildUser>[0];
// The piece she started from: hers, or a wish (with its brand, not hers yet).
export type KeyPiece = AroundPiece & { wish?: { brand: string | null } };
export type Ask =
  | Exclude<V12Ask, { mode: 'dress-me' }>
  | (Extract<V12Ask, { mode: 'dress-me' }> & { key?: KeyPiece });

const LABEL_MAX = 120;
const BRAND_MAX = 60;

export function keyBlock(key: KeyPiece, hasPhoto: boolean): string {
  const label = key.label.trim();
  if (!label) return '';
  const photo = hasPhoto ? ' A photo of it is attached.' : '';
  if (key.wish) {
    const brand = key.wish.brand?.trim();
    return `THE KEY PIECE — a piece on her wishlist she is thinking of buying, not hers yet: ${fenceUserText(label, LABEL_MAX)}${brand ? ` by ${fenceUserText(brand, BRAND_MAX)}` : ''}.${photo} Build the look around it with the pieces she owns, so she can see whether it earns its place in her wardrobe: list it by its exact label (wardrobe_index -1, with its brand), and choose every other piece to suit it.`;
  }
  return `THE KEY PIECE — she started from this piece of hers and asked for a look built around it: ${fenceUserText(label, LABEL_MAX)}${photo} The look wears it, listed by its exact label from her wardrobe, and every other piece is chosen to suit it.`;
}

export function buildUser(ask: Ask, opts: Parameters<typeof v12.buildUser>[1]): string {
  if (ask.mode !== 'dress-me' || !ask.key) return v12.buildUser(ask, opts);
  const { key, ...rest } = ask;
  const out = v12.buildUser(rest, opts);
  const block = keyBlock(key, opts.hasPhoto);
  return block ? `${out}\n\n${block}` : out;
}
