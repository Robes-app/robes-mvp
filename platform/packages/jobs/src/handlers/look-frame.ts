import { AiError, type AiProvider, type InlineImage } from '@robes/ai';
import { twinFigureLine, withPictureNote } from '@robes/ai/prompts/avatar';
import {
  buildImagePrompt,
  FEATURE,
  type FramePiece,
  type FrameSetting,
  MAX_REFERENCES,
  type Mode,
} from '@robes/ai/prompts/style-piece';
import {
  catalogKey,
  robesModelId,
  type StoodOn,
  standOf,
  twinInputsOf,
  twinSpec,
} from '@robes/core/avatar';
import type { SystemRepositories, UserId } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';

// Drawing Robes' frame of a suggested look (legacy /api/style's image loop, 2026-10-13): her
// model's cell first when she has one, the key piece's photo, then each of her pieces' photographs
// as numbered references; proposals are named. Shared by the key_piece job and look_render.
export interface FrameDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
  styling: Pick<SystemRepositories['styling'], 'createGeneratedAsset' | 'modelCellId'>;
  cells?: Pick<SystemRepositories['modelRender'], 'cell'> &
    Partial<Pick<SystemRepositories['modelRender'], 'model'>>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  onGenerated?(key: string): Promise<void>;
}

export interface FrameRackPiece {
  name: string;
  category: string;
  color: string;
  brand: string;
  // Her piece's photo, when it is hers.
  imageAssetId: string | null;
}

type Ctx = { jobId: string; userId: UserId; signal: AbortSignal };

async function read(storage: FrameDeps['storage'], key: string): Promise<Uint8Array | null> {
  try {
    return await storage.getObject(key);
  } catch {
    return null;
  }
}

export interface ModelReference {
  image: InlineImage | null;
  // Her close-up beside her twin, the face (legacy modelRefsForUser); null on any other model.
  face: InlineImage | null;
  // Her figure in words beside her twin (a reference carries a face, not proportions); else ''.
  figure: string;
  // What the image is (plan 2026-11-05 §2.4), recorded on the look when the frame lands; null
  // with no image.
  on: StoodOn | null;
  // The catalog cell it is, recorded beside `on` so a re-dress anchors to that portrait; null on
  // her twin (a re-dress reads her twin as it is then).
  cellId: string | null;
}
const NO_MODEL: ModelReference = { image: null, face: null, figure: '', on: null, cellId: null };

type ModelRow = NonNullable<
  Awaited<ReturnType<NonNullable<NonNullable<FrameDeps['cells']>['model']>>>
>;

// Her twin, with her close-up and her figure line: every picture of her starts from these, so a
// redraw is never a copy of the last picture (beta's modelRefsForUser; testing 17 Nov).
async function twinReference(
  deps: Pick<FrameDeps, 'storage'>,
  userId: UserId,
  row: ModelRow,
): Promise<ModelReference | null> {
  if (!row.twinAssetId) return null;
  const data = await read(deps.storage, mediaKeys.master(userId, row.twinAssetId));
  if (!data) return null;
  const inputs = twinInputsOf(row);
  const face = inputs.closeUpAssetId
    ? await read(deps.storage, mediaKeys.master(userId, inputs.closeUpAssetId))
    : null;
  return {
    image: { mimeType: 'image/jpeg', data },
    face: face ? { mimeType: 'image/jpeg', data: face } : null,
    figure: twinFigureLine(twinSpec(inputs, face !== null)),
    on: 'twin',
    cellId: null,
  };
}

async function cellReference(
  deps: Pick<FrameDeps, 'storage' | 'cells'>,
  cellId: string,
  on: 'cell' | 'robes',
): Promise<ModelReference | null> {
  const cell = await deps.cells?.cell(catalogKey(cellId));
  if (cell?.status !== 'ready' || !cell.bucketKey) return null;
  const data = await read(deps.storage, cell.bucketKey);
  if (!data) return null;
  const mimeType = (cell.contentType ?? 'image/png') as InlineImage['mimeType'];
  return { image: { mimeType, data }, face: null, figure: '', on, cellId };
}

// What she stands on, as IMAGE 1 when ready (standOf, plan 2026-11-05): her twin, else her
// hand-built cell, else a Robes model. With none chosen, the k-th way of a set stands on the k-th
// Robes model (legacy 0.4), so the ways read as different people; one chosen carries every way.
export async function modelReference(
  deps: Pick<FrameDeps, 'storage' | 'styling' | 'cells'>,
  userId: UserId,
  generic?: { wearer: 'woman' | 'man'; index: number },
): Promise<ModelReference> {
  if (!deps.cells) return NO_MODEL;
  const row = deps.cells.model ? await deps.cells.model(userId) : undefined;
  const stand = row
    ? standOf(row)
    : { on: 'cell' as const, cellId: await deps.styling.modelCellId(userId) };
  // Her twin first: it is her (legacy modelRefsForUser, 2026-10-20).
  if (stand.on === 'twin' && row) {
    const twin = await twinReference(deps, userId, row);
    if (twin) return twin;
  }
  let cellId: string | null = stand.on === 'twin' ? null : stand.cellId;
  const unchosen = stand.on === 'robes' ? row?.modelPreset == null : !cellId;
  if (unchosen && generic) {
    const n = ((generic.index % 5) + 5) % 5;
    cellId = robesModelId(generic.wearer, (n + 1) as 1 | 2 | 3 | 4 | 5);
  }
  if (!cellId) return NO_MODEL;
  return (
    (await cellReference(deps, cellId, unchosen || stand.on === 'robes' ? 'robes' : 'cell')) ??
    NO_MODEL
  );
}

// The person a re-dressed frame shows, from the model it was first drawn on: her twin as it is
// now, or the catalog cell recorded with the frame. Null when nothing was recorded (a frame from
// before `stood_on_cell`, or one drawn on no model) or the model is gone (she deleted her twin).
export async function frameAnchor(
  deps: Pick<FrameDeps, 'storage' | 'styling' | 'cells'>,
  userId: UserId,
  stood: { on: StoodOn | null; cellId: string | null },
): Promise<ModelReference | null> {
  if (stood.on === 'twin') {
    const row = deps.cells?.model ? await deps.cells.model(userId) : undefined;
    return row ? twinReference(deps, userId, row) : null;
  }
  if ((stood.on === 'cell' || stood.on === 'robes') && stood.cellId) {
    return cellReference(deps, stood.cellId, stood.on);
  }
  return null;
}

export async function drawSuggestedFrame(
  deps: FrameDeps,
  ctx: Ctx,
  opts: {
    wearer: 'woman' | 'man';
    mode: Mode;
    fallback: boolean;
    pieceLabel: string | null;
    piecePhoto: Uint8Array | null;
    model: InlineImage | null;
    // Beside her twin: her close-up (IMAGE 2) and her figure in words.
    face?: InlineImage | null;
    figure?: string;
    styleIcons: string[];
    brief: string | null;
    way: { title: string; eyebrow: string; scene: string };
    rack: readonly FrameRackPiece[];
    capability: 'image.hero' | 'image.secondary';
    // Her note on the picture (D21): how it is drawn, never what is worn.
    pictureNote?: string | null;
    // Her draft stands in the studio on her model (design 1b); a suggestion in its scene.
    setting?: FrameSetting;
  },
): Promise<string> {
  const references: InlineImage[] = [];
  if (opts.model) references.push(opts.model);
  const face = opts.model ? (opts.face ?? null) : null;
  if (face) references.push(face);
  if (opts.piecePhoto && !opts.fallback)
    references.push({ mimeType: 'image/jpeg', data: opts.piecePhoto });
  const pieces: FramePiece[] = [];
  const cap = references.length + MAX_REFERENCES;
  const seen = new Map<string, Uint8Array | null>();
  for (const p of opts.rack) {
    let photo: Uint8Array | null = null;
    if (p.imageAssetId && references.length < cap) {
      if (!seen.has(p.imageAssetId)) {
        seen.set(
          p.imageAssetId,
          await read(deps.storage, mediaKeys.master(ctx.userId, p.imageAssetId)),
        );
      }
      photo = seen.get(p.imageAssetId) ?? null;
    }
    if (photo) references.push({ mimeType: 'image/jpeg', data: photo });
    pieces.push({
      name: p.name,
      category: p.category,
      color: p.color,
      brand: p.brand,
      hasImage: Boolean(photo),
    });
  }
  const feature = `${FEATURE}.image`;
  try {
    const { image, usage } = await deps.ai.generateImage({
      feature,
      capability: opts.capability,
      prompt: withPictureNote(
        buildImagePrompt({
          wearer: opts.wearer,
          mode: opts.mode,
          fallback: opts.fallback,
          pieceLabel: opts.pieceLabel,
          hasModel: Boolean(opts.model),
          hasFace: face !== null,
          figure: opts.model ? (opts.figure ?? '') : '',
          hasPiecePhoto: Boolean(opts.piecePhoto),
          styleIcons: opts.styleIcons,
          brief: opts.brief,
          way: opts.way,
          pieces,
          ...(opts.setting ? { setting: opts.setting } : {}),
        }),
        opts.pictureNote,
      ),
      ...(references.length ? { references } : {}),
      aspectRatio: '4:5',
      signal: ctx.signal,
    });
    await deps.ledger.record({
      ...usage,
      jobId: ctx.jobId,
      userId: ctx.userId,
      feature,
      status: 'ok',
    });
    const assetId = await deps.styling.createGeneratedAsset(ctx.userId);
    const key = mediaKeys.original(ctx.userId, assetId);
    await deps.storage.putObject(key, image.data, { contentType: image.mimeType });
    await deps.onGenerated?.(key);
    return assetId;
  } catch (err) {
    if (err instanceof AiError && err.usage) {
      await deps.ledger.record({
        ...err.usage,
        jobId: ctx.jobId,
        userId: ctx.userId,
        feature,
        status: err.code === 'timeout' ? 'timeout' : 'error',
      });
    }
    throw err;
  }
}
