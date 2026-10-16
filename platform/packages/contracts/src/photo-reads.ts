import { z } from 'zod';
import { CreatePieceInput, LEGACY_CATEGORY, Piece } from './wardrobe';

// Several pieces from one photograph (legacy 2026-10-13): one read behind "several pieces to the
// wardrobe" and "a look from a photo". Every piece is confirmed by her, never filed on Robes' word.

const fraction = z.number().min(0).max(1);
export const PieceBox = z.object({ x: fraction, y: fraction, w: fraction, h: fraction });
export type PieceBox = z.infer<typeof PieceBox>;

const pieceIndex = z.number().int().min(0).max(7);

export const ReadPiece = z.object({
  index: pieceIndex,
  label: z.string(),
  category: LEGACY_CATEGORY,
  categoryL2: z.string().nullable(),
  categoryL3: z.string().nullable(),
  color: z.string().nullable(),
  brand: z.string().nullable(),
  notes: z.string().nullable(),
  // Fractions of the photo: the tag sits at its centre.
  box: PieceBox,
  // Her piece it very likely is, read against her wardrobe; null when Robes sees a new one.
  match: z.object({ pieceId: z.uuid(), confidence: fraction }).nullable(),
  // The piece's own crop of the photo (renders a moment after the read).
  cropAssetId: z.uuid(),
});
export type ReadPiece = z.infer<typeof ReadPiece>;

export const StartPhotoReadInput = z.object({ assetId: z.uuid() });
export const PhotoReadParams = z.object({ id: z.uuid() });

// Her edits from the single-piece screen, scoped to one piece of the read.
export const ReadPieceEdits = CreatePieceInput.omit({ imageAssetId: true });
export type ReadPieceEdits = z.infer<typeof ReadPieceEdits>;

// Use case 3: every piece answered — add it (with her edits), it's one she owns, or skip it.
export const FileAnswer = z.discriminatedUnion('state', [
  z.object({ index: pieceIndex, state: z.literal('add'), edits: ReadPieceEdits.optional() }),
  z.object({ index: pieceIndex, state: z.literal('owned'), pieceId: z.uuid() }),
  z.object({ index: pieceIndex, state: z.literal('skip') }),
]);
export type FileAnswer = z.infer<typeof FileAnswer>;

export const FileReadInput = z.object({ answers: z.array(FileAnswer).min(1).max(8) });
export type FileReadInput = z.infer<typeof FileReadInput>;

export const FileReadOutput = z.object({
  filed: z.array(Piece),
  // Pieces she owned with no photo, which took the crop as their photograph.
  photoAdded: z.array(z.uuid()),
});
export type FileReadOutput = z.infer<typeof FileReadOutput>;

// Use case 2b: every piece answered — new (filed on save), hers, or left out of the look.
export const LookAnswer = z.discriminatedUnion('state', [
  z.object({ index: pieceIndex, state: z.literal('new') }),
  z.object({ index: pieceIndex, state: z.literal('owned'), pieceId: z.uuid() }),
  z.object({ index: pieceIndex, state: z.literal('skip') }),
]);
export type LookAnswer = z.infer<typeof LookAnswer>;

export const LookFromPhotoInput = z.object({
  answers: z.array(LookAnswer).max(8),
  name: z.string().trim().min(1).max(120).optional(),
  // "Wearing it today, log it worn": her local date, sent only when she ticks it.
  wornOn: z.iso.date().optional(),
});
export type LookFromPhotoInput = z.infer<typeof LookFromPhotoInput>;
