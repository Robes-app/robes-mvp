import {
  ASK_MAX_CHARS,
  ASK_RACK_MAX,
  ASK_THREAD_MAX,
  BALANCE_NOTE_MAX,
  BALANCES,
  LOOK_STATUSES,
  PROPOSAL_KEY_PATTERN,
} from '@robes/core/looks';
import { z } from 'zod';
import { LEGACY_CATEGORY, Piece, PieceImage, SeasonBand } from './wardrobe';

// Style a piece: one of her pieces, or a piece described in words.
export const LookAnchorInput = z.discriminatedUnion('type', [
  z.object({ type: z.literal('piece'), pieceId: z.uuid() }),
  z.object({ type: z.literal('text'), text: z.string().trim().min(2).max(300) }),
]);
export type LookAnchorInput = z.infer<typeof LookAnchorInput>;

// Where the pieces of a new look come from: her chip, or her own words when they name none.
const BalanceFields = {
  balance: z.enum(BALANCES).optional(),
  balanceNote: z.string().trim().min(1).max(BALANCE_NOTE_MAX).optional(),
};

export const GenerateLookInput = z.object({
  anchor: LookAnchorInput,
  occasion: z.string().trim().max(120).optional(),
  ...BalanceFields,
});
export type GenerateLookInput = z.infer<typeof GenerateLookInput>;

// One piece of a styled way (style-piece v2): what she'd wear, and her own piece when she owns it.
export const IdeaPiece = z.object({
  name: z.string(),
  category: z.string(),
  color: z.string(),
  colorHex: z.string().nullable(),
  role: z.string().nullable(),
  brand: z.string(),
  retailerHint: z.string(),
  pricePoint: z.string(),
  pieceId: z.uuid().nullable(),
});
export type IdeaPiece = z.infer<typeof IdeaPiece>;

export const IdeaWay = z.object({
  eyebrow: z.string(),
  title: z.string(),
  // v3 ways are one scene line; ideas before it carry the three-paragraph prose instead.
  scene: z.string().default(''),
  outfit: z.string().default(''),
  details: z.string().default(''),
  accessories: z.string().default(''),
  tags: z.array(z.string()),
  // Ideas from before v2 have none.
  pieces: z.array(IdeaPiece).default([]),
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

// Look states (docs/look-states-brief.md): Robes' offer, her draft, a look she kept.
export const LookStatus = z.enum(LOOK_STATUSES);
export type LookStatus = z.infer<typeof LookStatus>;

// A rack row is keyed by her piece's id, or a proposal's own key.
export const ProposalKey = z.string().regex(PROPOSAL_KEY_PATTERN);
export const RackKey = z.union([z.uuid(), ProposalKey]);

// A piece Robes proposes for the look, not hers yet (♡ saves it to her wishlist).
export const Proposal = z.object({
  key: ProposalKey,
  name: z.string().trim().min(1).max(120),
  category: LEGACY_CATEGORY.catch('Other'),
  color: z.string().max(40).default(''),
  brand: z.string().max(60).default(''),
  retailerHint: z.string().max(60).default(''),
  pricePoint: z.string().max(20).default(''),
  role: LookRole.nullable().default(null),
  wishlisted: z.boolean().default(false),
});
export type Proposal = z.infer<typeof Proposal>;

const RackRowJson = z.object({
  key: RackKey,
  pieceId: z.uuid().nullable(),
  name: z.string().max(120),
  category: z.string().max(40),
  brand: z.string().max(60).nullable(),
  role: LookRole.nullable(),
  proposal: Proposal.nullable(),
});
// A draft's working note per row: what a change replaced, or that the prompt put it back.
export const RowEdit = z.object({ was: RackRowJson.optional(), back: z.boolean().optional() });
const MAX_ROWS = 20;
const keyed = <T extends z.ZodType>(value: T) =>
  z
    .record(RackKey, value)
    .refine((r) => Object.keys(r).length <= MAX_ROWS, { message: 'too many rows' });
export const Styling = keyed(z.string().trim().min(1).max(120));
export const Edits = keyed(RowEdit);

export const LookPieceInput = z.object({
  pieceId: z.uuid(),
  slot: z.string().trim().max(40).nullable().optional(),
  role: LookRole.nullable().optional(),
});

const lookName = z.string().trim().min(1).max(120);
const wornOn = z.iso.date();

// The piece a suggestion was styled around, as its tile and eyebrow need it.
export const LookAnchor = z.object({
  id: z.uuid(),
  label: z.string(),
  brand: z.string().nullable(),
  image: PieceImage.nullable(),
});
export type LookAnchor = z.infer<typeof LookAnchor>;

export const Look = z.object({
  id: z.uuid(),
  status: LookStatus,
  name: z.string(),
  // True while the name is Robes' suggestion; naming it makes it hers.
  nameProvisional: z.boolean(),
  note: z.string().nullable(),
  source: z.string(),
  originLookId: z.uuid().nullable(),
  climateBand: SeasonBand,
  // The look's picture — the record, its cover on the Lookbook and in the diary: the one she picked
  // of `photo` and `model`, else her photograph when she has one, else Robes' picture.
  image: PieceImage.nullable(),
  // Her own photograph of the look, and Robes' picture of it (the frame, else the render on her
  // model). With both, the look page's You / Model pair chooses the record (Look redline 27 Oct).
  photo: PieceImage.nullable(),
  model: PieceImage.nullable(),
  record: z.enum(['photo', 'model']),
  // True when the picture is Robes' frame: it holds through every state; edits re-draw it and
  // her model never replaces it.
  frame: z.boolean(),
  // A frame re-drawing for the rack as it stands now.
  framePending: z.boolean(),
  composedByRobes: z.boolean(),
  // "See it on me": where the render on her model stands (absent when never asked).
  onModel: z.enum(['pending', 'ready', 'failed']).nullable().optional(),
  pieces: z.array(
    z.object({ piece: Piece, slot: z.string().nullable(), role: LookRole.nullable() }),
  ),
  proposals: z.array(Proposal),
  styling: z.record(z.string(), z.string()),
  edits: z.record(z.string(), RowEdit),
  anchor: LookAnchor.nullable(),
  setId: z.uuid().nullable(),
  setIndex: z.number().int().nullable(),
  // The day her words named: offered on Save, never filed by itself.
  dateHint: wornOn.nullable(),
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
  status: LookStatus.default('saved'),
  // The piece page's "Robes suggested" rail.
  anchorPieceId: z.uuid().optional(),
  // The piece page's "In N looks": the looks this piece is on.
  pieceId: z.uuid().optional(),
});
export type ListLooksInput = z.infer<typeof ListLooksInput>;

export const LookPage = z.object({ items: z.array(Look), nextCursor: z.string().nullable() });
export type LookPage = z.infer<typeof LookPage>;

const rackFields = {
  proposals: z.array(Proposal).max(MAX_ROWS),
  styling: Styling,
  edits: Edits,
  dateHint: wornOn.nullable(),
};

export const CreateLookInput = z.object({
  name: lookName.optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  climateBand: SeasonBand.optional(),
  pieces: z.array(LookPieceInput).max(50),
  // A draft is hers, unsaved; five wait at most (letGoOldest makes room for a sixth).
  status: z.enum(['saved', 'draft']).optional(),
  letGoOldest: z.boolean().optional(),
  anchorPieceId: z.uuid().optional(),
  ...z.object(rackFields).partial().shape,
});
export type CreateLookInput = z.infer<typeof CreateLookInput>;

// "Update" edits in place; "Save as new" is POST /looks/:id/variants (UX-28).
export const UpdateLookInput = z
  .object({
    name: lookName,
    note: z.string().trim().max(2000).nullable(),
    climateBand: SeasonBand,
    pieces: z.array(LookPieceInput).max(50),
    ...rackFields,
    // Editing a suggestion makes it a draft: at five drafts, she lets the oldest go.
    letGoOldest: z.boolean(),
    // ↻ on a suggested look's row (legacy 0.1): the swap lands on the suggestion, which stays one.
    keepSuggested: z.boolean(),
    // You / Model: which picture is the record.
    record: z.enum(['photo', 'model']),
  })
  .partial();
export type UpdateLookInput = z.infer<typeof UpdateLookInput>;

// Her own photograph of the look, once the bytes are uploaded: the asset is hers or there is
// nothing to attach (the composite key on app.looks makes that true in the database too).
export const LookPhotoInput = z.object({ assetId: z.uuid() });
export type LookPhotoInput = z.infer<typeof LookPhotoInput>;

export const WearInput = z.object({ wornOn });
export const Wear = z.object({
  id: z.uuid(),
  lookId: z.uuid(),
  wornOn,
  pieceIds: z.array(z.uuid()),
});
export type Wear = z.infer<typeof Wear>;

// One wear as the look's record reads it: the day, and the pieces she wore THAT day, named.
// The names come from the snapshot, so the row keeps saying what she wore after the look moves
// on; a piece she has since let go of has no name left to give and is counted, not named.
export const LookWear = z.object({
  id: z.uuid(),
  wornOn,
  pieces: z.array(z.object({ id: z.uuid(), label: z.string().nullable() })),
});
export type LookWear = z.infer<typeof LookWear>;
export const LookWearPage = z.object({ items: z.array(LookWear) });
export type LookWearPage = z.infer<typeof LookWearPage>;

export const SaveWayInput = z.object({ wayIdx: z.number().int().min(0).max(2) });

// Suggested or draft → saved; a name she typed makes it hers.
export const SaveLookInput = z.object({ name: lookName.optional() });

// A new look in her words: three suggested looks for a day (dated when her words or a door name one).
export const PromptLookInput = z.object({
  prompt: z.string().trim().min(2).max(300),
  date: wornOn.optional(),
  ...BalanceFields,
});
export type PromptLookInput = z.infer<typeof PromptLookInput>;

// The keep-or-pass deck: one generation's looks, in the order Robes wrote them.
export const LookSetParams = z.object({ id: z.uuid() });
export const LookSet = z.object({
  id: z.uuid(),
  mode: z.enum(['piece', 'prompt']),
  // Her words, for a prompted set.
  prompt: z.string().nullable(),
  anchor: LookAnchor.nullable(),
  dateHint: wornOn.nullable(),
  jobId: z.uuid().nullable(),
  looks: z.array(Look),
});
export type LookSet = z.infer<typeof LookSet>;

// ── The look prompt (docs/look-prompt-brief.md) ──────────────────────────
export const AskSurface = z.enum(['draft', 'saved', 'suggested', 'day']);
const AskRackRow = z.object({
  key: RackKey,
  // Her piece (its facts come from her wardrobe, never from here), or a proposal's words.
  pieceId: z.uuid().nullable(),
  proposal: Proposal.pick({ name: true, category: true, brand: true }).nullable(),
  keep: z.boolean().default(false),
  was: z.string().trim().max(120).nullable().default(null),
  styled: z.string().trim().max(120).nullable().default(null),
});
export const LookAskInput = z.object({
  surface: AskSurface,
  text: z.string().trim().min(1).max(ASK_MAX_CHARS),
  // The exchange while the box is open; never stored anywhere but this job.
  thread: z
    .array(z.object({ who: z.enum(['her', 'robes']), text: z.string().trim().max(400) }))
    .max(ASK_THREAD_MAX)
    .default([]),
  rack: z.array(AskRackRow).min(1).max(ASK_RACK_MAX),
  context: z
    .object({
      day: z.string().trim().max(40).optional(),
      weather: z.string().trim().max(60).optional(),
      occasion: z.string().trim().max(80).optional(),
    })
    .optional(),
});
export type LookAskInput = z.infer<typeof LookAskInput>;
export const LookAskJobInput = LookAskInput.extend({ lookId: z.uuid() });

export const AskIntent = z.enum(['swap', 'back', 'rule', 'styled', 'clarify', 'draft', 'none']);
export const AskTarget = z.union([
  z.object({
    pieceId: z.uuid(),
    name: z.string(),
    category: z.string(),
    brand: z.string().nullable(),
  }),
  z.object({
    proposal: z.object({
      name: z.string(),
      category: z.string(),
      color: z.string(),
      brand: z.string(),
      retailerHint: z.string(),
      pricePoint: z.string(),
    }),
  }),
]);
// An EDIT against the rack she sent, keyed by her row keys — never a new look.
export const LookAskResult = z.object({
  intent: AskIntent,
  reply: z.string(),
  swaps: z.array(z.object({ key: RackKey, to: AskTarget })),
  back: z.array(RackKey),
  backAll: z.boolean(),
  styled: z.array(z.object({ key: RackKey, note: z.string() })),
  // Robes' wording of a vague ask, written into her field for her to send or edit.
  draft: z.string(),
  // A rule in her voice; it waits under Robes noticed (`noticed` true when it was added).
  rule: z.string(),
  noticed: z.boolean(),
});
export type LookAskResult = z.infer<typeof LookAskResult>;

// key_piece job input: a piece, her words for a day, or ↻ on one suggested look.
export const KeyPieceJobInput = z.union([
  GenerateLookInput,
  z.object({
    mode: z.literal('prompt'),
    prompt: z.string().min(2).max(300),
    date: wornOn.optional(),
    ...BalanceFields,
  }),
  z.object({ mode: z.literal('restyle'), lookId: z.uuid() }),
]);
export type KeyPieceJobInput = z.infer<typeof KeyPieceJobInput>;

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
  // Robes' frame of a look: drawn for a suggestion that has none yet, or re-dressed after an edit.
  z.object({
    target: z.literal('frame'),
    lookId: z.uuid(),
    frameKey: z.string().min(1).max(400),
  }),
]);
export type LookRenderInput = z.infer<typeof LookRenderInput>;
