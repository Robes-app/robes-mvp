import { MATERIAL_IDS, materialPromptBlock, resolveMaterial } from '@robes/core/material';
import { z } from 'zod';
import {
  type AnalysedPiece as AnalysedPieceV3,
  buildUser as buildUserV3,
  COLOUR_RULES,
  fakeOutput as fakeOutputV3,
  Output as OutputV3,
  toPiece as toPieceV3,
} from './v3';

// v4: legacy 2026-10-24 (design "Colour & material, one section") — the material model. ONE
// material from the shared list, read from the photo and any visible care or composition label,
// and whether it needs her check. Optional rather than an empty-string enum value: Gemini rejects
// an empty enum entry, so "can't tell" is the field left out.
export * from './v3';
export const VERSION = 4;

export const Output = OutputV3.extend({
  material: z.enum(MATERIAL_IDS as [string, ...string[]]).optional(),
  material_check: z.boolean(),
});
export type Output = z.infer<typeof Output>;

export const MATERIAL_RULES = `"material": the ONE material the piece is mostly made of, as an id from the MATERIALS list below. Read it from the photo and from any care or composition label you can see. A blend files under its main fibre (95% cotton, 5% elastane is cotton). A cloth is named for the cloth: denim, jersey, satin, velvet, lace, corduroy, tweed, sequins. Leather versus vegan leather only from clear cues (a label, the grain, the edge). Leave "material" out entirely when it cannot be told.
"material_check": true ONLY when you gave a material but are genuinely unsure of it; false otherwise.
MATERIALS:
${materialPromptBlock()}
`;

export function buildUser(): string {
  return buildUserV3().replace(COLOUR_RULES, `${COLOUR_RULES}${MATERIAL_RULES}`);
}

export interface AnalysedPiece extends AnalysedPieceV3 {
  material: string | null;
}

// The material is resolved through the one resolver; a check only rides a material she can see.
export function toPiece(out: Output): AnalysedPiece {
  const base = toPieceV3(out);
  const material = out.no_item_detected ? null : resolveMaterial(out.material);
  return {
    ...base,
    material,
    itemDna: {
      ...base.itemDna,
      ...(material && out.material_check ? { material_check: true } : {}),
      prompt_version: VERSION,
    },
  };
}

export function fakeOutput(): Output {
  return { ...fakeOutputV3(), material: 'wool', material_check: false };
}
