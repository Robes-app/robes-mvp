import {
  COLOUR_EXTRA_MAX,
  colourPromptBlock,
  PATTERN_IDS,
  pattern,
  resolveShade,
  SHADE_IDS,
} from '@robes/core/colour';
import { z } from 'zod';
import {
  type AnalysedPiece as AnalysedPieceV2,
  buildUser as buildUserV2,
  fakeOutput as fakeOutputV2,
  Output as OutputV2,
  toPiece as toPieceV2,
} from './v2';

// v3: legacy e39aabe (2026-10-22) — the colour model. One shade from the shared list, any further
// shades, the print and whether the colour needs her check; `color` becomes the shade's name.
export * from './v2';
export const VERSION = 3;

export const Output = OutputV2.extend({
  colour_shade: z.enum(SHADE_IDS as [string, ...string[]]),
  colour_extra: z.array(z.string().max(20)).max(6),
  print: z.enum(['plain', ...PATTERN_IDS] as [string, ...string[]]),
  colour_check: z.boolean(),
});
export type Output = z.infer<typeof Output>;

export const COLOUR_RULE_V2 = /"color": ONE of [^\n]*\n/;
export const COLOUR_RULES = `"colour_shade": the piece's colour as ONE shade id from the SHADES list below — the dominant or ground colour as it would read in life, not under the photo's light. A printed piece takes its ground colour. A piece whose main read is metallic (gold sandals, a silver bag) takes a Metallics shade; a navy jumper with gold buttons is navy. Neon shades sit inside their hue family.
"colour_extra": further shade ids for a two-colour or multi-colour piece, most prominent first, at most ${COLOUR_EXTRA_MAX} — a navy and white Breton is colour_shade navy, colour_extra ["optic"]. [] for a single-colour piece.
"print": ONE pattern id from the PATTERNS list, or "plain" for a piece with no print. A solid piece is "plain"; a print that fits no pattern is "other".
"colour_check": true ONLY when the light, a filter or a busy print leaves the colour genuinely uncertain — still give the best shade, never leave it; false otherwise.
SHADES:
${colourPromptBlock()}
"color": the display name of the shade you chose in colour_shade, exactly as listed (e.g. "Soft black", "Navy")
`;

export function buildUser(): string {
  return buildUserV2().replace(COLOUR_RULE_V2, COLOUR_RULES);
}

export interface AnalysedPiece extends AnalysedPieceV2 {
  colourShade: string | null;
  colourExtra: string[];
  print: string | null;
}

// The shade decides the colour word; a name or the read hex is the fallback, never nothing.
export function toPiece(out: Output): AnalysedPiece {
  const base = toPieceV2({ ...out, color: '' });
  if (out.no_item_detected) return { ...base, colourShade: null, colourExtra: [], print: null };
  const main = resolveShade({ id: out.colour_shade, name: out.color, hex: out.primary_color_hex });
  const extra = [
    ...new Set(
      out.colour_extra
        .map((x) => resolveShade({ id: x, name: x })?.id)
        .filter((id): id is string => !!id && id !== main?.id),
    ),
  ].slice(0, COLOUR_EXTRA_MAX);
  const print = pattern(out.print);
  return {
    ...base,
    color: main?.name ?? null,
    colourShade: main?.id ?? null,
    colourExtra: extra,
    print: print ? print.id : null,
    itemDna: {
      ...base.itemDna,
      ...(out.colour_check ? { colour_check: true } : {}),
      prompt_version: VERSION,
    },
  };
}

export function fakeOutput(): Output {
  return {
    ...fakeOutputV2(),
    color: 'Camel',
    colour_shade: 'camel',
    colour_extra: [],
    print: 'plain',
    colour_check: false,
  };
}
