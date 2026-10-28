import {
  collapsePairs,
  normaliseBox,
  PHOTO_PIECES_MAX,
  type PieceBox,
} from '@robes/core/photo-pieces';
import { z } from 'zod';
import { fenceUserText } from '../../fence';
import {
  type AnalysedPiece,
  Output as AnalyseOutput,
  buildUser as buildAnalyseUser,
  toPiece,
} from '../wardrobe-analyse/v4';

// Ported from legacy server.js /api/wardrobe/pieces (2026-10-13, with the same-day pair rules).
// v2 (2026-10-28): the field rules of wardrobe-analyse v4 — the colour model (shade, extra shades,
// print) and the material, as legacy's ANALYSE_FIELD_RULES already carried. v1 read neither.
export const FEATURE = 'wardrobe.pieces';
export const VERSION = 2;

export const Box = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });

export const ReadPiece = AnalyseOutput.omit({ no_item_detected: true }).extend({
  box: Box,
  wardrobe_index: z.number().int(),
  match_confidence: z.number(),
});
export type ReadPiece = z.infer<typeof ReadPiece>;

export const Output = z.object({
  no_item_detected: z.boolean(),
  // The model is asked for at most eight; extras are dropped after the pair fold, not refused.
  pieces: z.array(ReadPiece).max(20),
});
export type Output = z.infer<typeof Output>;

export const SYSTEM = `You are the fashion reader for Robes, a luxury wardrobe app. You look at one photo and file every piece in it. You never invent details that are not visible.`;

// The single read's field rules, one text, so the two reads never drift (legacy ANALYSE_FIELD_RULES).
export function fieldRules(): string {
  const single = buildAnalyseUser();
  return single.slice(single.indexOf('"label":'));
}

export interface ClosetEntry {
  id: string;
  label: string;
  category: string | null;
  color: string | null;
  brand: string | null;
}

function closetBlock(closet: readonly ClosetEntry[]): string {
  if (closet.length === 0) {
    return 'She has no pieces filed yet: "wardrobe_index" is -1 and "match_confidence" 0 for every piece.';
  }
  const lines = closet.map(
    (w, i) =>
      `[${i}] ${[w.label, w.category, w.color, w.brand].filter((v) => v?.trim()).join(' · ')}`,
  );
  return `HER WARDROBE, numbered — the pieces she already owns:
${fenceUserText(lines.join('\n'), 40_000)}
For each piece in the photo, "wardrobe_index" is the number of the owned piece it very likely IS — same kind of garment, same colour, a brand that agrees when one shows — else -1. "match_confidence" is how sure you are, 0 to 1. Never match a piece to a different kind of garment or a different colour. Shoes, bags, sunglasses and jewellery match on their kind and colour alone — a brand rarely shows on them in a photo, so when she owns one piece of that kind in that colour, that is the match, with a confidence of 0.6 or more.`;
}

export function buildUser(closet: readonly ClosetEntry[]): string {
  return `Find EVERY distinct clothing piece in this photo — each garment, each pair of shoes, each bag, each accessory — whether worn together on one person, laid flat, or hung side by side. One entry per physical piece, and each physical piece EXACTLY ONCE: a pair of shoes is ONE piece (never the left shoe and the right shoe as two, never two entries for one pair under two colours), a pair of earrings one piece, a two-piece set two pieces, one bracelet one entry. Ignore the person, the room and anything that is not a piece she could file in a wardrobe. At most ${PHOTO_PIECES_MAX} pieces, the most prominent first. A photo of ONE piece returns one entry.

If no clothing item, garment or accessory is clearly visible (a face, a room, a screenshot, unidentifiable content), set "no_item_detected": true and return an empty "pieces" array.

For each piece fill every field:
${fieldRules()}
"box": where THIS piece sits in the photo, as fractions of the image's width and height — "x" and "y" the top-left corner, "w" and "h" the size, all between 0 and 1. Tight around the piece, not the whole figure.

${closetBlock(closet)}`;
}

export interface PhotoPiece extends Omit<AnalysedPiece, 'noItemDetected'> {
  index: number;
  category: AnalyseOutput['category'];
  box: PieceBox;
  match: { pieceId: string; confidence: number } | null;
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

// Every piece through the single read's shape, deduped by label + category, boxes clamped, the
// match read against the list the prompt numbered, pairs folded, at most eight.
export function toPieces(out: Output, closet: readonly ClosetEntry[]): PhotoPiece[] {
  if (out.no_item_detected) return [];
  const seen = new Set<string>();
  const pieces: Omit<PhotoPiece, 'index'>[] = [];
  for (const raw of out.pieces) {
    const analysed = toPiece({ ...raw, no_item_detected: false });
    if (!analysed.label) continue;
    const key = `${analysed.label}|${raw.category}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const owned = raw.wardrobe_index >= 0 ? closet[raw.wardrobe_index] : undefined;
    const { noItemDetected: _, ...fields } = analysed;
    pieces.push({
      ...fields,
      category: raw.category,
      itemDna: { ...analysed.itemDna, prompt_version: `${FEATURE}@${VERSION}` },
      box: normaliseBox(raw.box),
      match: owned ? { pieceId: owned.id, confidence: clamp01(raw.match_confidence) } : null,
    });
  }
  return collapsePairs(pieces)
    .slice(0, PHOTO_PIECES_MAX)
    .map((p, index) => ({ ...p, index }));
}

const FAKE_PIECES: Omit<ReadPiece, 'wardrobe_index' | 'match_confidence'>[] = [
  {
    label: 'Cream long-sleeve t-shirt',
    category: 'Tops',
    category_l2: 'T-shirts & tees',
    category_l3: 'Long-sleeve t-shirt',
    color: 'Cream',
    primary_color_hex: '#F2EBDD',
    editorial_color_name: 'Soft Cream',
    brand: '',
    silhouette_fit: ['Fitted', 'Long-sleeve'],
    formality: 'casual',
    price: '',
    currency: '',
    size: '',
    ai_generated_notes: 'An easy cream layer that sits under everything.',
    colour_shade: 'cream',
    colour_extra: [],
    print: 'plain',
    colour_check: false,
    material: 'cotton',
    material_check: false,
    box: { x: 0.3, y: 0.15, w: 0.4, h: 0.25 },
  },
  {
    label: 'Black leggings',
    category: 'Bottoms',
    category_l2: 'Active bottoms',
    category_l3: 'Leggings',
    color: 'Black',
    primary_color_hex: '#111111',
    editorial_color_name: 'Ink Black',
    brand: '',
    silhouette_fit: ['Skinny', 'High-rise'],
    formality: 'casual',
    price: '',
    currency: '',
    size: '',
    ai_generated_notes: 'Black leggings, the quiet base of a running kit.',
    colour_shade: 'softblack',
    colour_extra: [],
    print: 'plain',
    colour_check: false,
    material: 'jersey',
    material_check: false,
    box: { x: 0.35, y: 0.42, w: 0.3, h: 0.38 },
  },
  {
    label: 'White running shoes',
    category: 'Shoes',
    category_l2: 'Trainers',
    category_l3: 'Running shoe',
    color: 'White',
    primary_color_hex: '#F7F7F5',
    editorial_color_name: 'Chalk White',
    brand: 'Salomon',
    silhouette_fit: ['Low-top', 'Cushioned'],
    formality: 'casual',
    price: '',
    currency: '',
    size: '',
    ai_generated_notes: 'Clean white runners that make the kit look deliberate.',
    colour_shade: 'optic',
    colour_extra: [],
    print: 'plain',
    colour_check: false,
    material: 'leather',
    material_check: false,
    box: { x: 0.35, y: 0.85, w: 0.3, h: 0.12 },
  },
];

// Offline fixture: a tee and leggings she doesn't own, and trainers matched to the first pair of
// shoes in her closet (by the prompt's numbered categories), so both outcomes run without Gemini.
export function fakeOutput(closetCategories: readonly string[] = []): Output {
  const shoes = closetCategories.indexOf('Shoes');
  return {
    no_item_detected: false,
    pieces: FAKE_PIECES.map((p) => ({
      ...p,
      wardrobe_index: p.category === 'Shoes' ? shoes : -1,
      match_confidence: p.category === 'Shoes' && shoes >= 0 ? 0.8 : 0,
    })),
  };
}

// The categories of the numbered closet lines in a built prompt (the fake's only input).
export function closetCategoriesIn(user: string): string[] {
  return [...user.matchAll(/^\[\d+\] (.*)$/gm)].map((m) => m[1]?.split(' · ')[1] ?? '');
}
