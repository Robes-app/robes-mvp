import { styleDnaPromptBlock } from '@robes/core/style-dna';
import { z } from 'zod';
import {
  BRIEF,
  type ClosetPiece,
  FALLBACK_RULE,
  genderBlock,
  type StyleContext,
  Way as WayV1,
  wearerRule,
} from './v1';

// v2 (legacy beta 2026-09-28): each way is itemised piece by piece — the closet is numbered so a
// piece can point at the exact owned piece — and the formula regains its "WHAT, never HOW" line.
// v1 stays for reference and its tests.
export {
  type Anchor,
  buildImagePrompt,
  buildUser,
  type ClosetPiece,
  FALLBACK_PIECE,
  FEATURE,
  type Gender,
  type StyleContext,
} from './v1';
export const VERSION = 2;
// A stored way as image prompts read it (pieces aren't needed to draw the look).
export const ImageWay = WayV1;
export const MAX_OUTPUT_TOKENS = 3400;

export const PIECE_ROLES = [
  'The Canvas',
  'The Anchor',
  'The Texture',
  'The Exclamation Point',
] as const;
const CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
  'Swimwear',
  'Other',
] as const;

// As the model returns it; normalisePieces() makes it safe to store.
export const RawPiece = z.object({
  name: z.string().max(200),
  category: z.string().max(40),
  color: z.string().max(80),
  color_hex: z.string().max(20),
  role: z.string().max(40),
  wardrobe_index: z.number().int(),
  brand: z.string().max(120).optional(),
  retailer_hint: z.string().max(120).optional(),
  price_point: z.string().max(40).optional(),
});
export type RawPiece = z.infer<typeof RawPiece>;

export const Way = WayV1.extend({ pieces: z.array(RawPiece).max(12).default([]) });
export type Way = z.infer<typeof Way>;

export const Output = z.object({
  fallback: z.boolean(),
  wearer: z.enum(['woman', 'man']),
  ways: z.array(Way).length(3),
});
export type Output = z.infer<typeof Output>;

export interface StoredPiece {
  name: string;
  category: (typeof CATEGORIES)[number];
  color: string;
  colorHex: string | null;
  role: (typeof PIECE_ROLES)[number] | null;
  brand: string;
  retailerHint: string;
  pricePoint: string;
  // Her own piece when the model used one from the numbered closet.
  pieceId: string | null;
}

// Legacy normStylePieces: a valid hex, a known role, at most six, the closet index resolved.
export function normalisePieces(
  pieces: readonly RawPiece[],
  closet: readonly ClosetPiece[],
): StoredPiece[] {
  const out: StoredPiece[] = [];
  for (const p of pieces) {
    if (!p.name.trim()) continue;
    const owned = p.wardrobe_index >= 0 ? closet[p.wardrobe_index] : undefined;
    const role = PIECE_ROLES.find((r) => r.toLowerCase() === p.role.toLowerCase()) ?? null;
    const category = CATEGORIES.find((c) => c === p.category) ?? 'Other';
    out.push({
      name: p.name.trim().slice(0, 80),
      category,
      color: p.color.slice(0, 40),
      colorHex: /^#[0-9A-Fa-f]{6}$/.test(p.color_hex) ? p.color_hex : null,
      role,
      brand: owned ? (owned.brand ?? '') : (p.brand ?? '').slice(0, 60),
      retailerHint: owned ? '' : (p.retailer_hint ?? '').slice(0, 60),
      pricePoint: owned ? '' : (p.price_point ?? '').slice(0, 20),
      pieceId: owned?.id ?? null,
    });
  }
  return out.slice(0, 6);
}

const FORMULA = `Every look follows the four-tier layer formula: 1) THE ANCHOR — the weather/agenda hero piece; 2) THE CANVAS — premium supporting basics; 3) THE TEXTURE — one depth-adding element; 4) THE EXCLAMATION POINT — the accessories, footwear and hardware that inject identity. Never give generic output like "jeans and a top" — name exact cuts, fabrications and styling techniques (e.g. "French-tuck a heavyweight silk button-down into high-waisted, wide-leg wool trousers").

STYLING SANITY CHECK: every styling move must be something a respected stylist would actually shoot on the street — honour the key piece's natural register. Sporty and athletic pieces stay in an elevated-casual register: never belt knitwear or cardigans over athletic shorts, never force waist-cinching or hourglass tricks onto a sporty silhouette, never layer formal tailoring over gym wear. Any silhouette or body-architecture rules below govern WHAT pieces you select — they are never a licence to contort HOW a piece is worn. If a styling trick needs explaining to look intentional, drop it: effortless always beats clever.

THE PIECES: alongside the prose, itemise every look in "pieces" — three to six entries, each one garment, shoe, bag or accessory the prose names, in the order Canvas → Anchor → Texture → Exclamation Point (one "role" each, from those four; the key piece is always one of them). "name" is the piece as worn ("Ivory silk shirt", "Tan leather loafers"); "category" one of Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories, Swimwear, Other; "color" a plain colour word and "color_hex" one representative hex for it. "wardrobe_index" is the number of the owned piece from the wardrobe list above when the piece IS that piece (use its exact label as the name), else -1. Only a piece she would have to find carries "brand", "retailer_hint" and "price_point" (a realistic EUR figure like "€89"); leave them empty on an owned piece.`;

function closetBlock(closet: ClosetPiece[]): string {
  const items = closet.slice(0, 60);
  if (items.length === 0) return '';
  const lines = items.map(
    (p, n) =>
      `[${n}] ${p.label}${p.category ? ` [${p.category}]` : ''}${p.color ? `, ${p.color}` : ''}${p.timesWorn > 0 ? `, worn ${p.timesWorn}×` : ''}`,
  );
  const directive =
    items.length >= 15
      ? 'Build each outfit primarily from the digitised wardrobe above — reference owned pieces by their exact labels, and add new pieces only where the closet has a true gap or for the Exclamation Point.'
      : 'The user already owns the pieces listed above. Wherever an owned piece genuinely serves the look, use it and refer to it by its exact label — an owned piece always beats a hypothetical one. Fill only the true gaps with new, editorially-matched pieces. Never reach for something she would have to buy when a relevant piece is already in the list.';
  return `THE USER'S DIGITISED WARDROBE (${lines.length} pieces, numbered from 0): ${lines.join('; ')}.\n${directive}`;
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

// Offline fixture so the full flow runs without Gemini.
export function fakeOutput(pieceLabel = 'the piece'): Output {
  const make = (eyebrow: string, title: string, outfit: string, under: string): Way => ({
    eyebrow,
    title,
    outfit,
    details: `Keep ${pieceLabel.toLowerCase()} the focus; everything else steps back.`,
    accessories: 'A slim leather belt, small gold hoops, a structured tote.',
    tags: ['everyday'],
    pieces: [
      {
        name: under,
        category: 'Tops',
        color: 'cream',
        color_hex: '#F2EADB',
        role: 'The Canvas',
        wardrobe_index: -1,
        brand: 'COS',
        retailer_hint: 'cos.com',
        price_point: '€69',
      },
      {
        name: pieceLabel,
        category: 'Other',
        color: 'camel',
        color_hex: '#C19A6B',
        role: 'The Anchor',
        wardrobe_index: -1,
      },
      {
        name: 'Tan leather loafers',
        category: 'Shoes',
        color: 'tan',
        color_hex: '#B07A4F',
        role: 'The Exclamation Point',
        wardrobe_index: -1,
        brand: 'Toteme',
        retailer_hint: 'toteme.com',
        price_point: '€390',
      },
    ],
  });
  return {
    fallback: false,
    wearer: 'woman',
    ways: [
      make(
        'Weekday',
        'Quiet confidence',
        `${pieceLabel} over a cream knit and straight-leg trousers.`,
        'Cream knit',
      ),
      make(
        'Weekend',
        'Easy Sunday',
        `${pieceLabel} with a striped tee, wide-leg denim and loafers.`,
        'Striped tee',
      ),
      make(
        'Evening',
        'After dark',
        `${pieceLabel} over a silk slip dress with strappy sandals.`,
        'Silk slip dress',
      ),
    ],
  };
}
