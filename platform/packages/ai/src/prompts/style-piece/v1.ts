import { styleDnaPromptBlock } from '@robes/core/style-dna';
import { z } from 'zod';
import { fenceUserText } from '../../fence';

// Ported from legacy server.js /api/style (key-piece mode); style-DNA block arrives with the
// packages/core style-dna port (M4 task 2). Versioned: change wording only via a new version.
export const FEATURE = 'looks.style_piece';
export const VERSION = 1;
export const FALLBACK_PIECE = 'black Balmain waistcoat with gold buttons';

export type Gender = 'woman' | 'man' | 'unspecified';

export const Way = z.object({
  eyebrow: z.string().max(60),
  title: z.string().max(80),
  outfit: z.string().max(700),
  details: z.string().max(700),
  accessories: z.string().max(400),
  tags: z.array(z.string().max(30)).max(8),
});
export type Way = z.infer<typeof Way>;

export const Output = z.object({
  fallback: z.boolean(),
  wearer: z.enum(['woman', 'man']),
  ways: z.array(Way).length(3),
});
export type Output = z.infer<typeof Output>;

export interface ClosetPiece {
  // Present from v2: lets an itemised piece point back at the exact owned piece.
  id?: string;
  brand?: string | null;
  label: string;
  category: string | null;
  color: string | null;
  timesWorn: number;
}

export interface StyleContext {
  firstName: string | null;
  gender: Gender;
  styleIcons: string[];
  closet: ClosetPiece[];
  // Stored style profile ({ color_harmony, silhouette_proportions, user_overrides }); may be empty.
  styleDna: unknown;
  wardrobeCount: number;
}

const FORMULA = `Every look follows the four-tier layer formula: 1) THE ANCHOR — the weather/agenda hero piece; 2) THE CANVAS — premium supporting basics; 3) THE TEXTURE — one depth-adding element; 4) THE EXCLAMATION POINT — the accessories, footwear and hardware that inject identity. Never give generic output like "jeans and a top" — name exact cuts, fabrications and styling techniques (e.g. "French-tuck a heavyweight silk button-down into high-waisted, wide-leg wool trousers").

STYLING SANITY CHECK: every styling move must be something a respected stylist would actually shoot on the street — honour the key piece's natural register. Sporty and athletic pieces stay in an elevated-casual register: never belt knitwear or cardigans over athletic shorts, never force waist-cinching or hourglass tricks onto a sporty silhouette, never layer formal tailoring over gym wear. If a styling trick needs explaining to look intentional, drop it: effortless always beats clever.`;

export const BRIEF = `When given a key fashion piece, you create three distinct, wearable looks around it — each with a clear occasion and mood. Your descriptions are specific: you name real item types, describe drape and texture, and explain why each pairing works.`;

export const FALLBACK_RULE = `IMPORTANT: You must set "fallback": true if ANY of these apply — the input is gibberish or random characters; no specific clothing item, garment, or accessory can be identified; the request is too vague to style (e.g. just a colour, a single generic word, or a non-fashion concept). When fallback is true, style a ${FALLBACK_PIECE} instead. Only set "fallback": false when a real, nameable fashion piece is clearly present.`;

export function genderBlock(g: Gender): string {
  if (g === 'man') {
    return 'The user identifies as a man. Every piece, look and recommendation must be menswear — male cuts, sizing and styling codes, menswear brands and male style references throughout. Never suggest womenswear. Where these instructions use "she"/"her" generically, they refer to this male client — read them as "he"/"him".';
  }
  if (g === 'unspecified') {
    return 'The user has not said how they identify. Use your best judgement from their words, their pieces and their wardrobe to decide whose clothing to recommend; when nothing points a direction, keep pieces and styling gender-neutral. Where these instructions use "she"/"her" generically, they simply refer to this client.';
  }
  return 'Your user is a stylish, fashion-forward woman — unless the input clearly indicates a male wearer, style all looks for a woman.';
}

export function wearerRule(g: Gender): string {
  if (g === 'man')
    return 'Set "wearer" to "man" — the user is a man and every look is styled for him.';
  if (g === 'unspecified') {
    return 'Set "wearer" to your best judgement of who the looks are styled for, based only on the user\'s words and the piece itself.';
  }
  return 'Set "wearer" to who the looks are styled for: "woman" unless the user\'s words clearly state the wearer is male — the piece itself being menswear or unisex (sportswear, an oversized jacket, boyfriend jeans) NEVER makes the wearer male.';
}

function closetBlock(closet: ClosetPiece[]): string {
  if (closet.length === 0) return '';
  const lines = closet
    .slice(0, 60)
    .map(
      (p) =>
        `${p.label}${p.category ? ` [${p.category}]` : ''}${p.color ? `, ${p.color}` : ''}${p.timesWorn > 0 ? `, worn ${p.timesWorn}×` : ''}`,
    );
  const directive =
    closet.length >= 15
      ? 'Build each outfit primarily from the digitised wardrobe above — reference owned pieces by their exact labels, and add new pieces only where the closet has a true gap or for the Exclamation Point.'
      : 'The user already owns the pieces listed above. Wherever an owned piece genuinely serves the look, use it and refer to it by its exact label — an owned piece always beats a hypothetical one. Fill only the true gaps with new, editorially-matched pieces. Never reach for something she would have to buy when a relevant piece is already in the list.';
  return `THE USER'S DIGITISED WARDROBE (${lines.length} pieces): ${lines.join('; ')}.\n${directive}`;
}

export function buildSystem(ctx: StyleContext): string {
  const who = ctx.firstName ? ` The user's name is ${ctx.firstName.slice(0, 60)}.` : '';
  const dna = styleDnaPromptBlock(ctx.styleDna, ctx.wardrobeCount, ctx.styleIcons);
  const closet = closetBlock(ctx.closet);
  return `You are an expert fashion stylist known for elegant, directional styling advice. Your tone is warm, precise, and editorial — like a trusted stylist who truly understands clothes. ${genderBlock(ctx.gender)}${who}

${BRIEF}

${FORMULA}

${FALLBACK_RULE}

${wearerRule(ctx.gender)}${dna ? `\n\n${dna}` : ''}${closet ? `\n\n${closet}` : ''}`;
}

export type Anchor = { type: 'piece'; label: string } | { type: 'text'; text: string };

export function buildUser(anchor: Anchor, occasion?: string): string {
  const piece =
    anchor.type === 'piece'
      ? `The key piece is described as: ${fenceUserText(anchor.label, 120)}. A photo of it is attached.`
      : `The key piece, in the user's words: ${fenceUserText(anchor.text, 300)}`;
  const context = occasion ? `\nThe occasion: ${fenceUserText(occasion, 120)}` : '';
  return `${piece}${context}

Style this key piece three ways. Make each look genuinely distinct — different occasions, moods, and dressing codes. Be specific about how the piece is worn and what surrounds it. Each look should feel complete and real.`;
}

const FULL_BODY_FRAME =
  'FULL-LENGTH FRAMING, HEAD TO TOE: the entire figure fits inside the frame — the full head and hair visible with clear space above, both shoes fully visible with clear space below. Never crop the face, head, hands or feet. Subject standing, centred, photographed from far enough back to capture the whole body.';

// Image prompts are built only from validated fields (SEC-23), never from raw model prose alone.
export function buildImagePrompt(opts: {
  wearer: 'woman' | 'man';
  pieceLabel: string;
  hasPiecePhoto: boolean;
  styleIcons: string[];
  way: Way;
}): string {
  const icons = opts.styleIcons.slice(0, 5);
  const iconLine = icons.length
    ? `The styling sensibility channels ${icons.join(', ')} — their signature silhouettes and fashion codes. `
    : '';
  const photoLine = opts.hasPiecePhoto
    ? "The attached photo shows the key piece only — reproduce the piece faithfully, but compose an entirely new scene; never copy the photo's framing, background or crop. "
    : '';
  const outfit = opts.way.outfit.trim().replace(/\.$/, '').slice(0, 500);
  return `PORTRAIT ORIENTATION ONLY. Single fashion editorial photograph — one ${opts.wearer}, alone, one scene, no collage, no split panels, no side-by-side images, no text. ${FULL_BODY_FRAME} The key piece is ${opts.pieceLabel.slice(0, 120)}. ${photoLine}${iconLine}Look: "${opts.way.title}" — ${opts.way.eyebrow}. The ${opts.wearer} wears the complete outfit: ${outfit}. Soft natural light, luxury campaign aesthetic.`;
}

// Offline fixture so the full flow runs without Gemini.
export function fakeOutput(pieceLabel = 'the piece'): Output {
  const make = (eyebrow: string, title: string, outfit: string): Way => ({
    eyebrow,
    title,
    outfit,
    details: `Keep ${pieceLabel.toLowerCase()} the focus; everything else steps back.`,
    accessories: 'A slim leather belt, small gold hoops, a structured tote.',
    tags: ['everyday'],
  });
  return {
    fallback: false,
    wearer: 'woman',
    ways: [
      make(
        'Weekday',
        'Quiet confidence',
        `${pieceLabel} over a cream knit and straight-leg trousers.`,
      ),
      make(
        'Weekend',
        'Easy Sunday',
        `${pieceLabel} with a striped tee, wide-leg denim and loafers.`,
      ),
      make('Evening', 'After dark', `${pieceLabel} over a silk slip dress with strappy sandals.`),
    ],
  };
}
