import { z } from 'zod';
import {
  type AnalysedPiece as AnalysedPieceV4,
  buildUser as buildUserV4,
  fakeOutput as fakeOutputV4,
  Output as OutputV4,
  toPiece as toPieceV4,
} from './v4';

// v5 (2026-11-07): a brand can come from a house's signature design, not only a printed mark.
// v4's "never invent" read left a blouse with an unreadable collar label unbranded where legacy's
// read named the house. A brand read from the design rides `brand_check` for her to confirm.
export * from './v4';
export const VERSION = 5;

export const Output = OutputV4.extend({ brand_check: z.boolean() });
export type Output = z.infer<typeof Output>;

export const SYSTEM = `You are the fashion reader for Robes, a luxury wardrobe app. You look at one photo and file the piece in it. You never invent details: every field is read from the photo, and the one call beyond what is printed, a brand known by its signature design, is flagged for her to check.`;

export const BRAND_RULE_V1 = '"brand": the brand if visible, else ""\n';
export const BRAND_RULES = `"brand": the brand. Read it first from anything printed on the piece: a label, a logo, hardware, a swing tag. With no legible mark, name the house only when the design is unmistakably its signature (a Barbour waxed jacket, a Burberry check trench, a Hermès Kelly, a Bottega Veneta intrecciato weave); never for a generic piece. Else "".
"brand_check": true when the brand comes from the design rather than a mark you can read; false when a mark shows it or "brand" is "".
`;

export function buildUser(): string {
  return buildUserV4().replace(BRAND_RULE_V1, BRAND_RULES);
}

export type AnalysedPiece = AnalysedPieceV4;

// A check only rides a brand Robes actually named.
export function toPiece(out: Output): AnalysedPiece {
  const base = toPieceV4(out);
  return {
    ...base,
    itemDna: {
      ...base.itemDna,
      ...(base.brand && out.brand_check ? { brand_check: true } : {}),
      prompt_version: VERSION,
    },
  };
}

export function fakeOutput(): Output {
  return { ...fakeOutputV4(), brand_check: false };
}
