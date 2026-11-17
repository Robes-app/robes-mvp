import {
  COLOUR_EXTRA_MAX,
  PATTERN_IDS,
  pattern,
  resolveShade,
  SHADE_IDS,
} from '@robes/core/colour';
import { MATERIAL_IDS, resolveMaterial } from '@robes/core/material';
import { z } from 'zod';
import { fenceUserText } from '../../fence';
import { COLOUR_RULES } from '../wardrobe-analyse/v3';
import { MATERIAL_RULES } from '../wardrobe-analyse/v4';
import {
  buildUser as buildUserV1,
  fakeOutput as fakeOutputV1,
  Output as OutputV1,
  SYSTEM as SYSTEM_V1,
  toRead as toReadV1,
} from './v1';

// v2 (2026-11-16, Annie's Lucy Nagle cardigan pasted on staging: brand, category, colour and
// material all blank where beta filled them): a pasted link's photo reads with what the shop's page
// says beside it (its category, the variant's options, the description that holds the
// composition), and the read files the colour model and the material as a camera read does
// (wardrobe-analyse v3/v4 rules). The photograph still decides what the piece is; the page's
// composition decides the material.
export { FEATURE } from './v1';
export const VERSION = 2;

export const Output = OutputV1.extend({
  colour_shade: z.enum(SHADE_IDS as [string, ...string[]]),
  colour_extra: z.array(z.string().max(20)).max(6),
  print: z.enum(['plain', ...PATTERN_IDS] as [string, ...string[]]),
  // Optional rather than an empty enum value: Gemini rejects '' in an enum.
  material: z.enum(MATERIAL_IDS as [string, ...string[]]).optional(),
});
export type Output = z.infer<typeof Output>;

const COLOUR_V1 = /"color": pick ONE from this list only: [^\n]*/;
const MATERIAL_V2 = MATERIAL_RULES.replace(/"material_check":[^\n]*\n/, '').replace(
  'Read it from the photo and from any care or composition label you can see.',
  'A composition the shop states ("100% cashmere", "Shell: 70% wool") decides it; otherwise read it from the photo and any care label you can see.',
);

export const SYSTEM = SYSTEM_V1.replace(
  'The image is the product photograph of ONE piece on an order confirmation a customer forwarded to us.',
  "The image is the product photograph of ONE piece: from an order confirmation a customer forwarded to us, or from a shop's product page she pasted.",
)
  .replace(
    'The user turn holds what the email printed beside it',
    'The user turn holds what the shop printed beside it',
  )
  .replace(
    COLOUR_V1,
    COLOUR_RULES.replace(/\n"colour_check":[^\n]*/, '')
      .replace(
        /"color": the display name[^\n]*\n?/,
        '"color": the display name of the shade you chose in colour_shade, exactly as listed\n',
      )
      .trimEnd(),
  )
  .concat(`\n${MATERIAL_V2.trimEnd()}`);

export interface Line {
  label: string;
  brand: string | null;
  size: string | null;
  retailer: string | null;
  // A pasted link's page: what the shop says of the piece. Absent for a receipt line.
  page?: {
    category: string | null;
    options: string | null;
    color: string | null;
    description: string | null;
  } | null;
}

export function buildUser(line: Line): string {
  const base = buildUserV1(line).replace(
    'WHAT THE EMAIL PRINTED FOR THIS ROW (may be a bare reference code):',
    line.page
      ? "WHAT THE SHOP'S PAGE SAYS OF THIS PIECE:"
      : 'WHAT THE EMAIL PRINTED FOR THIS ROW (may be a bare reference code):',
  );
  if (!line.page) return base;
  const p = line.page;
  return `${base}
category: ${fenceUserText(p.category ?? '', 80)}
options: ${fenceUserText(p.options ?? '', 160)}
colour: ${fenceUserText(p.color ?? '', 60)}
description: ${fenceUserText(p.description ?? '', 600)}`;
}

export interface PhotoRead {
  label: string;
  categoryL2: string | null;
  categoryL3: string | null;
  color: string | null;
  colourShade: string | null;
  colourExtra: string[];
  print: string | null;
  material: string | null;
}

// The shade decides the colour word (as wardrobe-analyse v3); the material goes through the one
// resolver. Null when the photo shows no piece or names none.
export function toRead(out: Output): PhotoRead | null {
  const base = toReadV1({ ...out, color: '' });
  if (!base) return null;
  const main = resolveShade({ id: out.colour_shade, name: out.color });
  const extra = [
    ...new Set(
      out.colour_extra
        .map((x) => resolveShade({ id: x, name: x })?.id)
        .filter((id): id is string => !!id && id !== main?.id),
    ),
  ].slice(0, COLOUR_EXTRA_MAX);
  return {
    ...base,
    color: main?.name ?? null,
    colourShade: main?.id ?? null,
    colourExtra: extra,
    print: pattern(out.print)?.id ?? null,
    material: resolveMaterial(out.material),
  };
}

// A canned answer for the fake provider (dev, e2e): a photo of a pink tracksuit top.
export function fakeOutput(): Output {
  return {
    ...fakeOutputV1(),
    color: 'Blush',
    colour_shade: SHADE_IDS.find((id) => id.includes('pink')) ?? (SHADE_IDS[0] as string),
    colour_extra: [],
    print: 'plain',
    material: 'cotton',
  };
}
