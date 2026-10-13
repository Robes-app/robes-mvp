import { AiError, type AiProvider, type ImageCapability } from '@robes/ai';
import { buildRenderPrompt, MAX_PIECE_REFERENCES, RENDER_FEATURE } from '@robes/ai/prompts/avatar';
import {
  buildAnchorPrompt,
  buildStillLifePrompt,
  FEATURE as DAILY_FEATURE,
  type NormalItem,
  type NormalLook,
} from '@robes/ai/prompts/daily';
import {
  buildImagePrompt,
  ImageWay,
  FEATURE as STYLE_FEATURE,
} from '@robes/ai/prompts/style-piece';
import { LookRenderInput } from '@robes/contracts';
import { cellKey, parseCellId } from '@robes/core/avatar';
import type { StoredFrame, SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';

export interface LookRenderDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
  styling: Pick<
    SystemRepositories['styling'],
    'context' | 'dailyContext' | 'anchorPiece' | 'createGeneratedAsset'
  >;
  frames: Pick<SystemRepositories['frames'], 'get' | 'set'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // "See it on me": her look on her model. Absent where the runtime doesn't render on models.
  model?: Pick<SystemRepositories['modelRender'], 'look' | 'cell' | 'setRender' | 'failRender'>;
  // Frames are stored as uploads; AWS renders them from the S3 event, dev renders here.
  onGenerated?(key: string): Promise<void>;
}

// The stored fields the prompts read; they were validated when the job that wrote them ran.
const StoredIdea = z.object({
  anchor: z.discriminatedUnion('type', [
    z.object({ type: z.literal('piece'), pieceId: z.uuid(), label: z.string() }),
    z.object({ type: z.literal('text'), label: z.string() }),
  ]),
  fallback: z.boolean(),
  wearer: z.enum(['woman', 'man']),
  ways: z.array(ImageWay),
});
const StoredDaily = z.object({
  look: z.object({
    occasionLabel: z.string(),
    steps: z.array(
      z.object({
        title: z.string(),
        items: z.array(z.looseObject({ imageIndex: z.number().int() })),
      }),
    ),
  }),
  weather: z.object({ city: z.string().nullable() }).nullable().optional(),
});

interface Plan {
  type: 'idea' | 'daily_look';
  id: string;
  idx: number;
  feature: string;
  capability: ImageCapability;
  prompt: string;
  references?: { mimeType: 'image/jpeg'; data: Uint8Array }[];
}

// One frame rendered on demand (UX-09): the hero renders up front, the rest when she asks.
export function createLookRenderHandler(deps: LookRenderDeps): JobHandler {
  async function planIdea(
    userId: Parameters<LookRenderDeps['styling']['context']>[0],
    ideaId: string,
    idx: number,
  ): Promise<Plan> {
    const row = await deps.frames.get(userId, ideaId, 'idea');
    const idea = StoredIdea.safeParse(row?.data);
    const way = idea.success ? idea.data.ways[idx] : undefined;
    if (!row || !idea.success || !way) throw new JobError('not_found');
    const { anchor, fallback, wearer } = idea.data;
    let photo: Uint8Array | null = null;
    if (anchor.type === 'piece' && !fallback) {
      const piece = await deps.styling.anchorPiece(userId, anchor.pieceId);
      if (piece?.imageAssetId) {
        photo = await deps.storage.getObject(mediaKeys.master(userId, piece.imageAssetId));
      }
    }
    const { styleIcons } = await deps.styling.context(userId);
    return {
      type: 'idea',
      id: ideaId,
      idx,
      feature: `${STYLE_FEATURE}.image`,
      capability: idx === 0 ? 'image.hero' : 'image.secondary',
      prompt: buildImagePrompt({
        wearer,
        pieceLabel: anchor.label,
        hasPiecePhoto: Boolean(photo),
        styleIcons,
        way,
      }),
      ...(photo ? { references: [{ mimeType: 'image/jpeg' as const, data: photo }] } : {}),
    };
  }

  async function planDaily(
    userId: Parameters<LookRenderDeps['styling']['context']>[0],
    dailyLookId: string,
    itemIdx: number,
  ): Promise<Plan> {
    const row = await deps.frames.get(userId, dailyLookId, 'daily_look');
    const daily = StoredDaily.safeParse(row?.data);
    if (!row || !daily.success) throw new JobError('not_found');
    const look = daily.data.look as unknown as NormalLook;
    const items = look.steps.flatMap((s) => s.items);
    const item = items.find((i) => i.imageIndex === itemIdx) as NormalItem | undefined;
    if (!item) throw new JobError('not_found');
    const anchor = look.steps.find((s) => s.title === 'The Anchor')?.items[0] ?? items[0];
    const isAnchor = anchor?.imageIndex === itemIdx;
    let prompt = buildStillLifePrompt(item);
    if (isAnchor) {
      const her = await deps.styling.dailyContext(userId);
      prompt = buildAnchorPrompt({
        gender: her.gender,
        look,
        styleIcons: her.styleIcons,
        city: daily.data.weather?.city ?? her.homeCity,
      });
    }
    return {
      type: 'daily_look',
      id: dailyLookId,
      idx: itemIdx,
      feature: `${DAILY_FEATURE}.image`,
      capability: isAnchor ? 'image.hero' : 'image.secondary',
      prompt,
    };
  }

  // Her saved look on her filed model (legacy /api/avatar/render): IMAGE 1 is the model cell,
  // then up to nine of her piece photos; the render becomes the look's image.
  async function renderLook(
    ctx: Parameters<JobHandler['run']>[0],
    lookId: string,
    renderKey: string,
  ) {
    const model = deps.model;
    if (!model) throw new JobError('unsupported');
    const found = await model.look(ctx.userId, lookId);
    if (!found || !found.cellId) throw new JobError('not_found');
    // She changed her model or the rack since asking: this render is no longer wanted.
    if (found.look.renderKey !== renderKey) throw new JobError('superseded');
    const cell = await model.cell(cellKey(found.cellId));
    const parsedCell = parseCellId(found.cellId);
    const cellImage =
      cell?.status === 'ready' && cell.bucketKey
        ? await deps.storage.getObject(cell.bucketKey)
        : null;
    if (!cellImage || !parsedCell) {
      await model.failRender(ctx.userId, lookId, renderKey);
      throw new JobError('model_not_ready');
    }
    const references: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: Uint8Array }[] =
      [
        {
          mimeType: (cell?.contentType as 'image/jpeg' | 'image/png' | 'image/webp') ?? 'image/png',
          data: cellImage,
        },
      ];
    const pieces = [];
    for (const p of found.pieces) {
      let photo: Uint8Array | null = null;
      if (
        references.length <= MAX_PIECE_REFERENCES &&
        p.imageAssetId &&
        p.assetStatus === 'ready'
      ) {
        photo = await deps.storage.getObject(mediaKeys.master(ctx.userId, p.imageAssetId));
      }
      if (photo) references.push({ mimeType: 'image/jpeg', data: photo });
      pieces.push({
        name: p.label,
        category: p.category,
        color: p.color,
        brand: p.brand,
        hasImage: Boolean(photo),
      });
    }
    if (pieces.length === 0) {
      await model.failRender(ctx.userId, lookId, renderKey);
      throw new JobError('empty_look');
    }
    const feature = RENDER_FEATURE;
    try {
      const { image, usage } = await deps.ai.generateImage({
        feature,
        capability: 'image.hero',
        prompt: buildRenderPrompt(parsedCell.gender, pieces),
        references,
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
      await model.setRender(ctx.userId, lookId, renderKey, assetId);
      await ctx.writeStage('images', { images: [{ idx: 0, status: 'ready', assetId }] });
      return { status: 'succeeded' as const };
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
      await model.failRender(ctx.userId, lookId, renderKey);
      if (ctx.signal.aborted || (err instanceof AiError && err.code === 'cancelled')) throw err;
      throw new JobError(err instanceof AiError ? `ai_${err.code}` : 'render_failed');
    }
  }

  return {
    budgetMs: 90_000,
    async run(ctx) {
      const parsed = LookRenderInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const input = parsed.data;
      if (input.target === 'look') {
        await ctx.writeStage('text', { lookId: input.lookId });
        return renderLook(ctx, input.lookId, input.renderKey);
      }
      // Written first so the Today tray can link the job to what it renders.
      await ctx.writeStage(
        'text',
        input.target === 'idea' ? { ideaId: input.ideaId } : { dailyLookId: input.dailyLookId },
      );
      const plan =
        input.target === 'idea'
          ? await planIdea(ctx.userId, input.ideaId, input.idx)
          : await planDaily(ctx.userId, input.dailyLookId, input.itemIdx);
      const frame = (status: StoredFrame['status'], assetId: string | null): StoredFrame => ({
        idx: plan.idx,
        assetId,
        status,
        jobId: ctx.jobId,
      });

      try {
        const { image, usage } = await deps.ai.generateImage({
          feature: plan.feature,
          capability: plan.capability,
          prompt: plan.prompt,
          ...(plan.references ? { references: plan.references } : {}),
          aspectRatio: '4:5',
          signal: ctx.signal,
        });
        await deps.ledger.record({
          ...usage,
          jobId: ctx.jobId,
          userId: ctx.userId,
          feature: plan.feature,
          status: 'ok',
        });
        const assetId = await deps.styling.createGeneratedAsset(ctx.userId);
        const key = mediaKeys.original(ctx.userId, assetId);
        await deps.storage.putObject(key, image.data, { contentType: image.mimeType });
        await deps.onGenerated?.(key);
        const ready = frame('ready', assetId);
        await deps.frames.set(ctx.userId, plan.id, plan.type, ready);
        await ctx.writeStage('images', { images: [{ idx: plan.idx, status: 'ready', assetId }] });
        return { status: 'succeeded', artifactId: plan.id };
      } catch (err) {
        if (err instanceof AiError && err.usage) {
          await deps.ledger.record({
            ...err.usage,
            jobId: ctx.jobId,
            userId: ctx.userId,
            feature: plan.feature,
            status: err.code === 'timeout' ? 'timeout' : 'error',
          });
        }
        // A failed frame can be asked for again.
        await deps.frames.set(ctx.userId, plan.id, plan.type, frame('failed', null));
        if (ctx.signal.aborted || (err instanceof AiError && err.code === 'cancelled')) throw err;
        throw new JobError(err instanceof AiError ? `ai_${err.code}` : 'render_failed');
      }
    },
  };
}
