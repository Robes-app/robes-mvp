import { z } from 'zod';
import {
  Output as AnalyseOutput,
  buildUser as buildAnalyseUser,
  toPiece,
} from '../wardrobe-analyse/v6';
import {
  Box,
  buildUser as buildUserV3,
  type ClosetEntry,
  fakeOutput as fakeOutputV3,
  fieldRules as fieldRulesV3,
  foldPieces,
  type PhotoPiece as PhotoPieceV3,
} from './v3';

// v4 (2026-11-21): the field rules of wardrobe-analyse v6: each piece's one defining detail, and
// whether it is being worn. A piece laid flat or hung can be cut out of the photograph by what
// her phone lifted; one on a person lifts as the whole person, so it keeps its rectangle (cutout
// brief). The read already looks at every piece, so the answers cost nothing more.
export * from './v3';
export const VERSION = 4;

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

export function fieldRules(): string {
  const single = buildAnalyseUser();
  return single.slice(single.indexOf('"label":'));
}

export function buildUser(closet: readonly ClosetEntry[]): string {
  return buildUserV3(closet).replace(fieldRulesV3(), fieldRules());
}

export interface PhotoPiece extends PhotoPieceV3 {
  // On a person in the photograph: never cut out, its rectangle stays.
  worn: boolean;
}

export function toPieces(out: Output, closet: readonly ClosetEntry[]): PhotoPiece[] {
  return foldPieces(out, closet, (raw) => toPiece({ ...raw, no_item_detected: false }), VERSION);
}

export function fakeOutput(closetCategories: readonly string[] = []): Output {
  const v3 = fakeOutputV3(closetCategories);
  return {
    ...v3,
    pieces: v3.pieces.map((p) => ({ ...p, defining_detail: '', worn: false })),
  };
}
