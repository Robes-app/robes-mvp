import { z } from 'zod';
import { toPiece } from '../wardrobe-analyse/v6';
import {
  buildUser as buildUserV4,
  type ClosetEntry,
  fakeOutput as fakeOutputV4,
  foldPieces,
  type PhotoPiece as PhotoPieceV4,
  ReadPiece as ReadPieceV4,
} from './v4';

// v5 (2026-11-27): her other pieces a found one may be. "Looks like your …" offers the likeliest
// and, when she says it is not that one, the next (Edit look, decision 13); v4 named one piece
// and had nothing to offer after it. Everything else is v4, to the letter.
export * from './v4';
export const VERSION = 5;

// How many of her other pieces the read keeps beside the likeliest.
export const ALSO_MAX = 2;

export const ALSO_RULE = `"also_indexes": when she owns more than one piece this could be, the numbers of up to ${ALSO_MAX} OTHER owned pieces it may be instead of "wardrobe_index", likeliest first, under the same rules (same kind of garment, same colour). An empty list when "wardrobe_index" is -1 or no other piece of hers is close.`;

export const ReadPiece = ReadPieceV4.extend({ also_indexes: z.array(z.number().int()) });
export type ReadPiece = z.infer<typeof ReadPiece>;

export const Output = z.object({
  no_item_detected: z.boolean(),
  // The model is asked for at most eight; extras are dropped after the pair fold, not refused.
  pieces: z.array(ReadPiece).max(20),
});
export type Output = z.infer<typeof Output>;

// She has nothing filed: there is nothing to number, so the rule is left out.
export function buildUser(closet: readonly ClosetEntry[]): string {
  const user = buildUserV4(closet);
  return closet.length === 0 ? user : `${user}\n${ALSO_RULE}`;
}

export interface PhotoPiece extends PhotoPieceV4 {
  // Her other pieces it may be, likeliest first; never the one in `match`.
  alsoMatches: string[];
}

// The numbers read against the list the prompt numbered: no piece twice, never the match itself,
// and none at all without a match.
function alsoOf(raw: ReadPiece, closet: readonly ClosetEntry[]): string[] {
  const first = raw.wardrobe_index >= 0 ? closet[raw.wardrobe_index] : undefined;
  if (!first) return [];
  const ids = raw.also_indexes.flatMap((i) => {
    const owned = i >= 0 ? closet[i] : undefined;
    return owned && owned.id !== first.id ? [owned.id] : [];
  });
  return [...new Set(ids)].slice(0, ALSO_MAX);
}

export function toPieces(out: Output, closet: readonly ClosetEntry[]): PhotoPiece[] {
  return foldPieces(
    out,
    closet,
    (raw) => ({
      ...toPiece({ ...raw, no_item_detected: false }),
      alsoMatches: alsoOf(raw, closet),
    }),
    VERSION,
  );
}

// Offline fixture: v4's, with a second pair of shoes in her closet as the trainers' other match.
export function fakeOutput(closetCategories: readonly string[] = []): Output {
  const v4 = fakeOutputV4(closetCategories);
  const shoes = closetCategories.flatMap((c, i) => (c === 'Shoes' ? [i] : []));
  return {
    ...v4,
    pieces: v4.pieces.map((p) => ({
      ...p,
      also_indexes: p.category === 'Shoes' ? shoes.slice(1, 1 + ALSO_MAX) : [],
    })),
  };
}
