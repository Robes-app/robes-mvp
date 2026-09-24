import { z } from 'zod';
import { PieceImage } from './wardrobe';

// Style a piece: one of her pieces, or a piece described in words.
export const LookAnchorInput = z.discriminatedUnion('type', [
  z.object({ type: z.literal('piece'), pieceId: z.uuid() }),
  z.object({ type: z.literal('text'), text: z.string().trim().min(2).max(300) }),
]);
export type LookAnchorInput = z.infer<typeof LookAnchorInput>;

export const GenerateLookInput = z.object({
  anchor: LookAnchorInput,
  occasion: z.string().trim().max(120).optional(),
});
export type GenerateLookInput = z.infer<typeof GenerateLookInput>;

export const IdeaWay = z.object({
  eyebrow: z.string(),
  title: z.string(),
  outfit: z.string(),
  details: z.string(),
  accessories: z.string(),
  tags: z.array(z.string()),
});
export type IdeaWay = z.infer<typeof IdeaWay>;

export const IdeaFrame = z.object({
  idx: z.number().int().min(0),
  status: z.enum(['pending', 'ready', 'failed']),
  image: PieceImage.nullable(),
});
export type IdeaFrame = z.infer<typeof IdeaFrame>;

export const Idea = z.object({
  id: z.uuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  anchor: z.discriminatedUnion('type', [
    z.object({ type: z.literal('piece'), pieceId: z.uuid(), label: z.string() }),
    z.object({ type: z.literal('text'), label: z.string() }),
  ]),
  // True when the piece couldn't be styled and Robes styled a fallback instead.
  fallback: z.boolean(),
  wearer: z.enum(['woman', 'man']),
  ways: z.array(IdeaWay),
  // Empty until the images stage finishes; the job's SSE stream carries live progress.
  frames: z.array(IdeaFrame),
  jobId: z.uuid().nullable(),
  savedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Idea = z.infer<typeof Idea>;

export const IdeaParams = z.object({ id: z.uuid() });

export const ListIdeasInput = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(30),
});
export type ListIdeasInput = z.infer<typeof ListIdeasInput>;

export const IdeaList = z.object({ items: z.array(Idea) });
export type IdeaList = z.infer<typeof IdeaList>;
