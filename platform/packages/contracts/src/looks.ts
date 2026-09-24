import { z } from 'zod';
import { Piece, PieceImage, SeasonBand } from './wardrobe';

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

// Only the hero frame renders up front; the others stay `deferred` until she asks (UX-09).
export const FrameStatus = z.enum(['pending', 'ready', 'failed', 'deferred']);
export type FrameStatus = z.infer<typeof FrameStatus>;

export const IdeaFrame = z.object({
  idx: z.number().int().min(0),
  status: FrameStatus,
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

// Saved looks (M4 task 6): pieces in order, named by her, worn on days.
export const LookRole = z.enum(['canvas', 'anchor', 'texture', 'exclamation']);

export const LookPieceInput = z.object({
  pieceId: z.uuid(),
  slot: z.string().trim().max(40).nullable().optional(),
  role: LookRole.nullable().optional(),
});

const lookName = z.string().trim().min(1).max(120);
const wornOn = z.iso.date();

export const Look = z.object({
  id: z.uuid(),
  name: z.string(),
  // True while the name is Robes' suggestion; naming it makes it hers.
  nameProvisional: z.boolean(),
  note: z.string().nullable(),
  source: z.string(),
  originLookId: z.uuid().nullable(),
  climateBand: SeasonBand,
  // Robes' render of the look (from an idea's frame), when there is one.
  image: PieceImage.nullable(),
  // "See it on me": where the render on her model stands (absent when never asked).
  onModel: z.enum(['pending', 'ready', 'failed']).nullable().optional(),
  pieces: z.array(
    z.object({ piece: Piece, slot: z.string().nullable(), role: LookRole.nullable() }),
  ),
  timesWorn: z.number().int().min(0),
  lastWornOn: wornOn.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Look = z.infer<typeof Look>;

export const LookParams = z.object({ id: z.uuid() });
export const WearParams = z.object({ id: z.uuid(), date: wornOn });

export const ListLooksInput = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(30),
  cursor: z.string().max(200).optional(),
});
export type ListLooksInput = z.infer<typeof ListLooksInput>;

export const LookPage = z.object({ items: z.array(Look), nextCursor: z.string().nullable() });
export type LookPage = z.infer<typeof LookPage>;

export const CreateLookInput = z.object({
  name: lookName.optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  climateBand: SeasonBand.optional(),
  pieces: z.array(LookPieceInput).max(50),
});
export type CreateLookInput = z.infer<typeof CreateLookInput>;

// "Update" edits in place; "Save as new" is POST /looks/:id/variants (UX-28).
export const UpdateLookInput = z
  .object({
    name: lookName,
    note: z.string().trim().max(2000).nullable(),
    climateBand: SeasonBand,
    pieces: z.array(LookPieceInput).max(50),
  })
  .partial();
export type UpdateLookInput = z.infer<typeof UpdateLookInput>;

export const WearInput = z.object({ wornOn });
export const Wear = z.object({
  id: z.uuid(),
  lookId: z.uuid(),
  wornOn,
  pieceIds: z.array(z.uuid()),
});
export type Wear = z.infer<typeof Wear>;

export const SaveWayInput = z.object({ wayIdx: z.number().int().min(0).max(2) });

export const IdeaFrameParams = z.object({
  id: z.uuid(),
  idx: z.coerce.number().int().min(0).max(2),
});

// look_render job input: one frame of an idea, or one item of a daily look, rendered on demand.
export const LookRenderInput = z.discriminatedUnion('target', [
  z.object({ target: z.literal('idea'), ideaId: z.uuid(), idx: z.number().int().min(0).max(2) }),
  z.object({
    target: z.literal('daily'),
    dailyLookId: z.uuid(),
    itemIdx: z.number().int().min(0).max(20),
  }),
  // A saved look on her model; renderKey pins which model and rack the render is for.
  z.object({
    target: z.literal('look'),
    lookId: z.uuid(),
    renderKey: z.string().min(1).max(400),
  }),
]);
export type LookRenderInput = z.infer<typeof LookRenderInput>;
