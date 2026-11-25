import {
  AGE_BAND_KEYS,
  BUST_CUPS,
  FIELD_UNITS,
  INVESTMENT_KEYS,
  MEASURE_FIELDS,
  type MeasureField,
  RETIRED_STYLE_TYPES,
  SEASON_WHEEL,
  STORED_RANGES,
  STYLE_TYPES,
  styleTypesOf,
} from '@robes/core/style-dna';
import { z } from 'zod';
import { ModelPresence } from './me';
import { PieceImage } from './wardrobe';

// You › Style Profile (legacy Settings 2026-10-07/08): Style DNA, the facts and the brief in her
// words. Everything here reaches every styling prompt through the one DNA block.

export const BriefListName = z.enum(['loves', 'avoids', 'rules']);
export type BriefListName = z.infer<typeof BriefListName>;
export const ObservationList = z.enum(['loves', 'avoids', 'rules', 'notes', 'colours']);
export type ObservationList = z.infer<typeof ObservationList>;

export const BriefLine = z.object({
  id: z.uuid(),
  list: BriefListName,
  text: z.string(),
  // drafted: kept from what Robes noticed; typed: her own words.
  source: z.enum(['drafted', 'edited', 'typed']),
  chip: z.string().nullable(),
  keptAt: z.iso.datetime(),
});
export type BriefLine = z.infer<typeof BriefLine>;

// A line Robes noticed that waits for her Keep or Not me.
export const Observation = z.object({
  id: z.uuid(),
  list: ObservationList,
  text: z.string(),
  because: z.string().nullable(),
  // read: from Robes' read of her wardrobe; prompt: a rule she said in passing.
  origin: z.enum(['read', 'prompt']),
});
export type Observation = z.infer<typeof Observation>;

export const AgeBand = z.enum(AGE_BAND_KEYS);
export const InvestmentLevel = z.enum(INVESTMENT_KEYS);

// Size, never weight. Lengths in cm (height and waist whole, the rest to the tenth), dress size and
// shoes as UK numbers, the bust as a UK band and cup (handoff 24 Nov: STORED_RANGES).
const R = STORED_RANGES;
const tenth = (key: keyof typeof R) =>
  z
    .number()
    .min(R[key].min)
    .max(R[key].max)
    .refine((n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-6)
    .nullable();
export const Facts = z.object({
  heightCm: z.number().int().min(R.heightCm.min).max(R.heightCm.max).nullable(),
  sizeUk: z
    .number()
    .int()
    .min(R.sizeUk.min)
    .max(R.sizeUk.max)
    .refine((n) => n % 2 === 0)
    .nullable(),
  shoeUk: z
    .number()
    .min(R.shoeUk.min)
    .max(R.shoeUk.max)
    .refine((n) => Number.isInteger(n * 2))
    .nullable(),
  ageBand: AgeBand.nullable(),
  // Her bust as a bra size (band + cup); the tape (bustCm) is no longer offered but still read.
  bustBand: z
    .number()
    .int()
    .min(R.bustBand.min)
    .max(R.bustBand.max)
    .refine((n) => n % 2 === 0)
    .nullable(),
  bustCup: z.enum(BUST_CUPS).nullable(),
  bustCm: z.number().int().min(R.bustCm.min).max(R.bustCm.max).nullable(),
  waistCm: z.number().int().min(R.waistCm.min).max(R.waistCm.max).nullable(),
  // His fit measures (24 Nov).
  chestCm: tenth('chestCm'),
  inseamCm: tenth('inseamCm'),
  collarCm: tenth('collarCm'),
  shoulderWidthCm: tenth('shoulderWidthCm'),
});
export type Facts = z.infer<typeof Facts>;

const name = z.string().trim().min(1).max(80);

// An older phone build may still send a retired type (30 Oct): read as its archetype, deduped.
const STYLE_TYPE_NAMES = [...STYLE_TYPES, ...Object.keys(RETIRED_STYLE_TYPES)] as [
  string,
  ...string[],
];

// Her display unit per row of The facts; a row left out shows its default.
export const UnitPrefs = z
  .object(
    Object.fromEntries(
      MEASURE_FIELDS.map((f) => [f, z.enum(FIELD_UNITS[f] as [string, ...string[]]).optional()]),
    ) as Record<MeasureField, z.ZodOptional<z.ZodEnum>>,
  )
  .strict();
export type UnitPrefs = z.infer<typeof UnitPrefs>;

export const StyleDna = z.object({
  types: z.array(z.string()),
  brands: z.array(z.string()),
  icons: z.array(z.object({ name: z.string(), tag: z.string() })),
  investment: InvestmentLevel.nullable(),
  facts: Facts,
  units: UnitPrefs,
  gender: ModelPresence,
  // Her starred pieces, in star order.
  pieces: z.array(
    z.object({
      id: z.uuid(),
      label: z.string(),
      category: z.string(),
      brand: z.string().nullable(),
      image: PieceImage.nullable(),
    }),
  ),
  brief: z.object({
    loves: z.array(BriefLine),
    avoids: z.array(BriefLine),
    rules: z.array(BriefLine),
    notes: z.string(),
    colours: z.object({ loved: z.array(z.string()), rejected: z.array(z.string()) }),
  }),
  observations: z.array(Observation),
  readAt: z.iso.datetime().nullable(),
  // Robes reads on its own once, and again when the last read is a week old and nothing waits.
  readDue: z.boolean(),
});
export type StyleDna = z.infer<typeof StyleDna>;

export const UpdateStyleDnaInput = z
  .object({
    types: z.array(z.enum(STYLE_TYPE_NAMES)).max(10).transform(styleTypesOf),
    brands: z.array(name).max(40),
    icons: z.array(name).max(20),
    investment: InvestmentLevel,
    facts: Facts.partial().strict(),
    units: UnitPrefs,
  })
  .partial()
  .strict();
export type UpdateStyleDnaInput = z.infer<typeof UpdateStyleDnaInput>;

export const AddBriefLineInput = z.object({
  list: BriefListName,
  text: z.string().trim().min(1).max(160),
  // The chip she tapped (Hard nos / Your rules), when the line came from one.
  chip: z.string().trim().min(1).max(60).optional(),
});
export type AddBriefLineInput = z.infer<typeof AddBriefLineInput>;

export const BriefLineParams = z.object({ id: z.uuid() });

export const ChooseSeasonInput = z.object({
  season: z.enum(SEASON_WHEEL as [string, ...string[]]),
});
export type ChooseSeasonInput = z.infer<typeof ChooseSeasonInput>;

// What she tells Robes on other surfaces (a verdict, a swap, an ask); read by every prompt.
const memoryBase = {
  surface: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(120).optional(),
  lookId: z.uuid().optional(),
};
export const RecordMemoryInput = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('verdict'),
    verdict: z.union([z.literal(0), z.literal(1)]),
    body: z.string().trim().max(240).optional(),
    ...memoryBase,
  }),
  z
    .object({
      kind: z.literal('swap'),
      pieceOut: z.string().trim().min(1).max(120).optional(),
      pieceIn: z.string().trim().min(1).max(120).optional(),
      category: z.string().trim().max(40).optional(),
      ...memoryBase,
    })
    .refine((s) => s.pieceOut || s.pieceIn),
  z.object({ kind: z.literal('ask'), body: z.string().trim().min(1).max(240), ...memoryBase }),
]);
export type RecordMemoryInput = z.infer<typeof RecordMemoryInput>;
