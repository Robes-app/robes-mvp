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
});
export type ListPiecesInput = z.infer<typeof ListPiecesInput>;

export const PiecePage = z.object({ items: z.array(Piece), nextCursor: z.string().nullable() });
export type PiecePage = z.infer<typeof PiecePage>;

const editable = {
  label: z.string().trim().min(1).max(120),
  categoryL2: z.string().max(60).nullable(),
  categoryL3: z.string().max(60).nullable(),
  color: z.string().max(60).nullable(),
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
  .object({ ...editable, heroPosition: z.number().int().min(1).max(10).nullable() })
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
