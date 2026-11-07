import { z } from 'zod';
import {
  SYSTEM as ANALYSE_SYSTEM,
  Output as AnalyseOutput,
  buildUser as buildAnalyseUser,
  toPiece,
} from '../wardrobe-analyse/v5';
import {
  Box,
  buildUser as buildUserV2,
  type ClosetEntry,
  fakeOutput as fakeOutputV2,
  fieldRules as fieldRulesV2,
  foldPieces,
  type PhotoPiece,
} from './v2';

// v3 (2026-11-07): the field rules of wardrobe-analyse v5. A brand can come from a house's
// signature design, flagged with `brand_check`; the system line says so instead of "never invent
// details that are not visible", which left a brand the photo can't spell out blank.
export * from './v2';
export const VERSION = 3;

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

export const SYSTEM = ANALYSE_SYSTEM.replace('file the piece in it', 'file every piece in it');

export function fieldRules(): string {
  const single = buildAnalyseUser();
  return single.slice(single.indexOf('"label":'));
}

export function buildUser(closet: readonly ClosetEntry[]): string {
  return buildUserV2(closet).replace(fieldRulesV2(), fieldRules());
}

export function toPieces(out: Output, closet: readonly ClosetEntry[]): PhotoPiece[] {
  return foldPieces(out, closet, (raw) => toPiece({ ...raw, no_item_detected: false }), VERSION);
}

export function fakeOutput(closetCategories: readonly string[] = []): Output {
  const v2 = fakeOutputV2(closetCategories);
  return { ...v2, pieces: v2.pieces.map((p) => ({ ...p, brand_check: false })) };
}
