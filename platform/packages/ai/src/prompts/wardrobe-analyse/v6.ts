import { detailOf } from '@robes/core';
import { z } from 'zod';
import {
  type AnalysedPiece as AnalysedPieceV5,
  buildUser as buildUserV5,
  fakeOutput as fakeOutputV5,
  Output as OutputV5,
  toPiece as toPieceV5,
} from './v5';

// v6 (2026-11-21): the piece's one defining detail. The shape words are generic ("Blazer,
// Single-breasted, Relaxed"), so the feature that makes a piece what it is was never written
// down: a Camilla and Marc coat whose padded, extended shoulder "is the essence of the style"
// was drawn as a soft trench (testing 19–21 Nov, PR 242's follow-up). Read once, in the same
// call, and filed beside the shape for the drawing prompts.
export * from './v5';
export const VERSION = 6;

export const Output = OutputV5.extend({ defining_detail: z.string().max(80), worn: z.boolean() });
export type Output = z.infer<typeof Output>;

export const SHAPE_RULE_V1 =
  '"silhouette_fit": 2-4 short descriptors (e.g. ["Blazer", "Single-breasted", "Relaxed"])\n';
export const DETAIL_RULE = `"defining_detail": the ONE feature that makes this piece itself and not a plain one of its kind, the thing a drawing of it must keep, in 2 to 6 words (e.g. "Strong padded shoulder", "Balloon sleeve gathered at the cuff", "Contrast white topstitching", "Oversized gold buttons", "Asymmetric draped neckline"). Read it from the photo. Never the colour, the material or the kind of garment alone: other fields carry those. "" when it is a plain example of its kind.
`;

// Whether the piece is on a person. One laid flat or hung can be cut out of the photograph by
// what her phone lifted; one on a person lifts as the whole person, so it keeps its photograph
// as it is (cutout brief). The read already looks at the piece, so the answer costs nothing more.
export const WORN_RULE = `"worn": true when this piece is on a person's body in the photo (worn, carried, or held against them); false when it lies flat, hangs, or stands by itself with no one in it.
`;

export function buildUser(): string {
  return buildUserV5().replace(SHAPE_RULE_V1, `${SHAPE_RULE_V1}${DETAIL_RULE}${WORN_RULE}`);
}

export type AnalysedPiece = AnalysedPieceV5 & {
  // On a person in the photograph: never cut out.
  worn: boolean;
};

// The detail files beside the shape, only when the read gave one that is a plain short phrase.
export function toPiece(out: Output): AnalysedPiece {
  const base = toPieceV5(out);
  const detail = out.no_item_detected ? null : detailOf(out.defining_detail);
  const shape = (base.itemDna.structural_dna ?? {}) as Record<string, unknown>;
  return {
    ...base,
    worn: out.worn,
    itemDna: {
      ...base.itemDna,
      structural_dna: { ...shape, ...(detail ? { defining_detail: detail } : {}) },
      // The photograph has been asked for its detail, found or not: the one-off re-read of
      // older pieces (wardrobe-detail) passes this piece by.
      detail_read: true,
      prompt_version: VERSION,
    },
  };
}

export function fakeOutput(): Output {
  return { ...fakeOutputV5(), defining_detail: 'Strong padded shoulder', worn: false };
}
