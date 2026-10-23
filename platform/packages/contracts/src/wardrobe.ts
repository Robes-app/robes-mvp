import { COLOUR_EXTRA_MAX, COLOUR_FAMILY_IDS, PATTERN_IDS, SHADE_IDS } from '@robes/core/colour';
import { z } from 'zod';
import { AssetRendition } from './media';

export const LEGACY_CATEGORY = z.enum([
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
  'Swimwear',
  'Other',
]);
export const SeasonBand = z.enum(['spring_summer', 'autumn_winter', 'year_round']);
// The colour model (@robes/core/colour): one shade, up to three more, and a print (null = plain).
export const ColourShade = z.enum(SHADE_IDS as [string, ...string[]]);
export const ColourFamily = z.enum(COLOUR_FAMILY_IDS as [string, ...string[]]);
export const Print = z.enum(PATTERN_IDS as [string, ...string[]]);
const colourFields = {
  colourShade: ColourShade.nullable(),
  colourExtra: z.array(ColourShade).max(COLOUR_EXTRA_MAX),
  print: Print.nullable(),
};
// Read side: defaulted across version skew, so an older server's response still parses.
const colourOut = {
  colourShade: z.string().nullable().default(null),
  colourExtra: z.array(z.string()).default([]),
  print: z.string().nullable().default(null),
};

export const PieceImage = z.object({
  assetId: z.uuid(),
  status: z.enum(['pending', 'ready', 'failed']),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  blurhash: z.string().nullable(),
  // Signed for the caller; empty until renditions exist.
  renditions: z.array(AssetRendition),
});
export type PieceImage = z.infer<typeof PieceImage>;

export const Piece = z.object({
  id: z.uuid(),
  label: z.string(),
  category: LEGACY_CATEGORY,
  categoryL2: z.string().nullable(),
  categoryL3: z.string().nullable(),
  color: z.string().nullable(),
  ...colourOut,
  // Robes wasn't sure of the colour (light, a filter, a busy print): she checks it.
  colourCheck: z.boolean().default(false),
  brand: z.string().nullable(),
  notes: z.string().nullable(),
  // 'reading' while Robes reads the photo; 'failed' when no piece was found in it.
  status: z.enum(['reading', 'ready', 'failed']),
  heroPosition: z.number().int().min(1).max(10).nullable(),
  seasonBand: SeasonBand,
  price: z.number().nullable(),
  currency: z.string().nullable(),
  size: z.string().nullable(),
  image: PieceImage.nullable(),
  // Times worn (the status line: "Worn 6×" / "Never worn"); defaulted across version skew.
  wearCount: z.number().int().min(0).default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Piece = z.infer<typeof Piece>;

export const PieceParams = z.object({ id: z.uuid() });

export const ListPiecesInput = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(60),
  cursor: z.string().max(200).optional(),
  category: LEGACY_CATEGORY.optional(),
  categoryL2: z.string().max(60).optional(),
  seasonBand: SeasonBand.optional(),
  colourFamily: ColourFamily.optional(),
});
export type ListPiecesInput = z.infer<typeof ListPiecesInput>;

export const PiecePage = z.object({
  items: z.array(Piece),
  nextCursor: z.string().nullable(),
  // Every piece matching the same filters (the count row), not just this page.
  total: z.number().int().min(0).default(0),
});
export type PiecePage = z.infer<typeof PiecePage>;

const editable = {
  label: z.string().trim().min(1).max(120),
  categoryL2: z.string().max(60).nullable(),
  categoryL3: z.string().max(60).nullable(),
  color: z.string().max(60).nullable(),
  ...colourFields,
  brand: z.string().trim().max(80).nullable(),
  notes: z.string().trim().max(1000).nullable(),
  seasonBand: SeasonBand,
  price: z.number().min(0).max(10_000_000).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  size: z.string().trim().max(40).nullable(),
};

export const CreatePieceInput = z.object(editable).partial().extend({
  label: editable.label,
  imageAssetId: z.uuid().optional(),
});
export type CreatePieceInput = z.infer<typeof CreatePieceInput>;

export const UpdatePieceInput = z
  .object({
    ...editable,
    heroPosition: z.number().int().min(1).max(10).nullable(),
    // The star: on takes the Hero Rack's first free place (409 when all ten are taken).
    hero: z.boolean(),
  })
  .partial();
export type UpdatePieceInput = z.infer<typeof UpdatePieceInput>;

// Batch capture (UX-17/18): N uploaded photos → N pieces reading + one analyse job each.
export const BatchPiecesInput = z.object({ assetIds: z.array(z.uuid()).min(1).max(30) });
export const BatchPiecesOutput = z.object({
  pieces: z.array(Piece),
  jobs: z.array(z.object({ pieceId: z.uuid(), jobId: z.uuid() })),
});
export type BatchPiecesOutput = z.infer<typeof BatchPiecesOutput>;

export const Deleted = z.object({ ok: z.literal(true) });

// Wishlist (M3 task 8): pieces she wants; "I bought this" promotes one into the wardrobe.
export const Wish = z.object({
  id: z.uuid(),
  label: z.string(),
  category: LEGACY_CATEGORY,
  categoryL2: z.string().nullable(),
  categoryL3: z.string().nullable(),
  color: z.string().nullable(),
  ...colourOut,
  brand: z.string().nullable(),
  note: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  size: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceLabel: z.string().nullable(),
  image: PieceImage.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Wish = z.infer<typeof Wish>;

export const WishParams = z.object({ id: z.uuid() });

export const ListWishesInput = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(60),
  cursor: z.string().max(200).optional(),
});
export type ListWishesInput = z.infer<typeof ListWishesInput>;

export const WishPage = z.object({ items: z.array(Wish), nextCursor: z.string().nullable() });
export type WishPage = z.infer<typeof WishPage>;

const wishEditable = {
  label: editable.label,
  categoryL2: editable.categoryL2,
  categoryL3: editable.categoryL3,
  color: editable.color,
  colourShade: editable.colourShade,
  colourExtra: editable.colourExtra,
  print: editable.print,
  brand: editable.brand,
  note: editable.notes,
  price: editable.price,
  currency: editable.currency,
  size: editable.size,
  // Stored for her reference only; Robes never fetches it from here (link import is SEC-40).
  sourceUrl: z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .nullable(),
  sourceLabel: z.string().trim().max(120).nullable(),
};

export const CreateWishInput = z.object(wishEditable).partial().extend({
  label: wishEditable.label,
  imageAssetId: z.uuid().optional(),
});
export type CreateWishInput = z.infer<typeof CreateWishInput>;

export const UpdateWishInput = z.object(wishEditable).partial();
export type UpdateWishInput = z.infer<typeof UpdateWishInput>;

// The wardrobe's category tabs: how many pieces she has in each.
export const WardrobeSummary = z.object({
  total: z.number().int().min(0),
  categories: z.array(z.object({ category: LEGACY_CATEGORY, count: z.number().int().min(1) })),
});
export type WardrobeSummary = z.infer<typeof WardrobeSummary>;
