import { AiError, type AiProvider, type InlineImage } from '@robes/ai';
import {
  buildImagePrompt,
  FEATURE,
  type FramePiece,
  MAX_REFERENCES,
  type Mode,
} from '@robes/ai/prompts/style-piece';
import { cellKey, genericCellId } from '@robes/core/avatar';
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
  cells?: Pick<SystemRepositories['modelRender'], 'cell'>;
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

// Her model cell as IMAGE 1, when it is ready. With no model of her own, the k-th way stands on
// the k-th generic Robes model (legacy 0.4) once that catalog cell is drawn; else no model.
export async function modelReference(
  deps: Pick<FrameDeps, 'storage' | 'styling' | 'cells'>,
  userId: UserId,
  generic?: { wearer: 'woman' | 'man'; index: number },
): Promise<InlineImage | null> {
  if (!deps.cells) return null;
  const cellId =
    (await deps.styling.modelCellId(userId)) ??
    (generic ? genericCellId(generic.wearer, generic.index) : null);
  if (!cellId) return null;
  const cell = await deps.cells.cell(cellKey(cellId));
  if (cell?.status !== 'ready' || !cell.bucketKey) return null;
  const data = await read(deps.storage, cell.bucketKey);
  if (!data) return null;
  const mimeType = (cell.contentType ?? 'image/png') as InlineImage['mimeType'];
  return { mimeType, data };
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
    styleIcons: string[];
    brief: string | null;
    way: { title: string; eyebrow: string; scene: string };
    rack: readonly FrameRackPiece[];
    capability: 'image.hero' | 'image.secondary';
  },
): Promise<string> {
  const references: InlineImage[] = [];
  if (opts.model) references.push(opts.model);
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
      prompt: buildImagePrompt({
        wearer: opts.wearer,
        mode: opts.mode,
        fallback: opts.fallback,
        pieceLabel: opts.pieceLabel,
        hasModel: Boolean(opts.model),
        hasPiecePhoto: Boolean(opts.piecePhoto),
        styleIcons: opts.styleIcons,
        brief: opts.brief,
        way: opts.way,
        pieces,
      }),
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
