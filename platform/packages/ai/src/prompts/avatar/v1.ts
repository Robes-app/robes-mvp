import { type ParsedCell, parseCellId } from '@robes/core/avatar';

// Ported from legacy server.js avatar cell + render (2026-09-01 "v2" base layer). The cell is the
// identity: renders always re-feed the cell image, never a re-description in text.
export const CELL_FEATURE = 'avatar.cell';
export const RENDER_FEATURE = 'avatar.render';
export const VERSION = 1;

const SKIN_WORDS = [
  'deep espresso brown',
  'rich mahogany brown',
  'warm chestnut brown',
  'golden tan',
  'warm honey beige',
  'soft warm sand',
  'light warm peach',
  'fair cool porcelain',
];
const HAIR_WORDS = [
  'jet black',
  'dark espresso brown',
  'chestnut brown',
  'golden caramel blonde',
  'light ash blonde',
];
// Prompt-side figure vocabulary only; it never reaches consumer copy.
const FIG_WORDS: Record<ParsedCell['figure'], string> = {
  hg: 'balanced figure with a clearly defined waist',
  pe: 'figure with hips gently fuller than her shoulders',
  re: 'straight athletic figure with a subtle waist',
  it: 'figure with shoulders gently broader than her hips',
  ap: 'soft rounded figure carrying fullness through the middle',
  nt: 'balanced natural figure',
};
const FIG_WORDS_M: Record<ParsedCell['figure'], string> = {
  hg: 'balanced, athletic build with a defined waist',
  pe: 'build carrying gentle fullness through the hips',
  re: 'straight, lean build',
  it: 'broad-shouldered build tapering to the waist',
  ap: 'soft, rounded build carrying fullness through the middle',
  nt: 'balanced natural build',
};
const NUDGE_WORDS: Record<ParsedCell['nudges'][number], string> = {
  ll: 'soft, curved lines',
  lr: 'long, straight lines',
  fl: 'a fuller frame',
  fr: 'a narrower, slighter frame',
};

const FULL_BODY_FRAME =
  'FULL-LENGTH FRAMING, HEAD TO TOE: the entire figure fits inside the frame — the full head and hair visible with clear space above, both shoes fully visible with clear space below. Never crop the face, head, hands or feet. Subject standing, centred, photographed from far enough back to capture the whole body.';
const STUDIO =
  'Soft even daylight, clean warm-grey studio backdrop, photorealistic editorial photography, no text overlays, no collage, one single image.';

export function describeCell(cellId: string): string | null {
  const c = parseCellId(cellId);
  if (!c) return null;
  const man = c.gender === 'man';
  const hairLine = man
    ? `short ${HAIR_WORDS[c.hair]} hair`
    : `long ${HAIR_WORDS[c.hair]} hair worn down`;
  let d = `${man ? 'He' : 'She'} has ${SKIN_WORDS[c.skin]} skin, ${hairLine}, and a ${(man ? FIG_WORDS_M : FIG_WORDS)[c.figure]}`;
  const extras = c.nudges.map((n) => NUDGE_WORDS[n]);
  if (extras.length) d += `, with ${extras.join(' and ')}`;
  return `${d}.`;
}

// The reference portrait on a near-nude seamless base layer, so garments later read against it.
export function buildCellPrompt(cellId: string): string | null {
  const desc = describeCell(cellId);
  const c = parseCellId(cellId);
  if (!desc || !c) return null;
  const man = c.gender === 'man';
  const baseLayer = man
    ? 'He wears a minimal fitted base layer in one soft neutral tone close to his skin — a plain fitted crew-neck T-shirt and plain fitted knee-length shorts — barefoot, no accessories, no jewellery, no logos, no patterns.'
    : 'She wears a minimal seamless base layer in one soft neutral tone close to her skin — a fitted scoop-neck stretch tank top and matching fitted mid-thigh shorts, like a seamless shapewear set — barefoot, no accessories, no jewellery, no logos, no patterns.';
  return `Full-length editorial fashion photograph of one ${man ? 'man' : 'woman'}, alone — a recurring model, and this is the reference portrait. ${desc} ${baseLayer} Standing relaxed, facing the camera directly, arms at ${man ? 'his' : 'her'} sides, calm expression${man ? '' : ', hair worn down, naturally framing her face'}. ${FULL_BODY_FRAME} ${STUDIO}`;
}

export interface RenderPiece {
  name: string;
  category?: string | null;
  color?: string | null;
  brand?: string | null;
  // True when her photo of the piece rides as a reference image (in the same order).
  hasImage: boolean;
}

// IMAGE 1 is the cell; photographed pieces follow as IMAGE 2.. in order (legacy: up to 9).
export function buildRenderPrompt(gender: 'woman' | 'man', pieces: readonly RenderPiece[]): string {
  const man = gender === 'man';
  let imageN = 1;
  const lines = pieces.map((p) => {
    const name = p.name.slice(0, 120);
    const detail =
      [p.color?.slice(0, 40), p.category?.slice(0, 40)].filter(Boolean).join(' ') +
      (p.brand ? ` by ${p.brand.slice(0, 60)}` : '');
    const said = detail ? ` (${detail})` : '';
    if (p.hasImage) {
      imageN += 1;
      return `- IMAGE ${imageN}: the ${name}${said} — reproduce this exact garment faithfully: its true colour, cut, fabric and details.`;
    }
    return `- the ${name}${said}.`;
  });
  const outfit =
    pieces.length > 1
      ? 'this complete outfit — every listed piece worn together, nothing substituted, nothing extra beyond simple essentials'
      : 'this piece, worn over the plain fitted base layer from IMAGE 1 — nothing substituted, nothing extra';
  return (
    `Create one photorealistic editorial photograph. IMAGE 1 is the model. Keep the SAME ${man ? 'man' : 'woman'}: identical face, hair, skin tone and figure; a faithful likeness of IMAGE 1. ` +
    `Dress ${man ? 'him' : 'her'} in ${outfit}:\n${lines.join('\n')}\n` +
    `Standing naturally, facing the camera. ${FULL_BODY_FRAME} ${STUDIO} Generate the single photograph now.`
  );
}

// Legacy: 1 model + 9 garments stays inside the provider's 14-reference budget.
export const MAX_PIECE_REFERENCES = 9;
