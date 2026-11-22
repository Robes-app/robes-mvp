import { AiError, type AiProvider, type ImageCapability, type InlineImage } from '@robes/ai';
import {
  buildFrameRenderPrompt,
  buildRenderPrompt,
  FRAME_FEATURE,
  MAX_PIECE_REFERENCES,
  RENDER_FEATURE,
  twinFigureLine,
} from '@robes/ai/prompts/avatar';
import {
  buildAnchorPrompt,
  buildStillLifePrompt,
  FEATURE as DAILY_FEATURE,
  type NormalItem,
  type NormalLook,
} from '@robes/ai/prompts/daily';
import { FEATURE as STYLE_FEATURE } from '@robes/ai/prompts/style-piece';
import { buildImagePrompt as buildIdeaImagePrompt } from '@robes/ai/prompts/style-piece/v2';
import { LookRenderInput } from '@robes/contracts';
import {
  catalogGender,
  catalogKey,
  type StoodOn,
  twinInputsOf,
  twinSpec,
} from '@robes/core/avatar';
import { categoryFromWords, detailOf, shapeOf } from '@robes/core/taxonomy';
import type { StoredFrame, SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { pieceReference } from '../piece-photo';
import { JobError, type JobHandler } from '../runtime';
import { drawSuggestedFrame, type FrameRackPiece, frameAnchor, modelReference } from './look-frame';
import { frameSetting, StoredSet } from './style-piece';

export interface LookRenderDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
  styling: Pick<
    SystemRepositories['styling'],
    | 'context'
    | 'dailyContext'
    | 'anchorPiece'
    | 'createGeneratedAsset'
    | 'discardGenerated'
    | 'getSet'
    | 'modelCellId'
  >;
  // Robes' frame of a suggested look (look states); absent where the runtime doesn't draw them.
  suggested?: Pick<SystemRepositories['suggested'], 'look' | 'setFrame' | 'failFrame'>;
  frames: Pick<SystemRepositories['frames'], 'get' | 'set'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // "See it on me": her look on her model. Absent where the runtime doesn't render on models.
  model?: Pick<
    SystemRepositories['modelRender'],
    'look' | 'cell' | 'setRender' | 'failRender' | 'model'
  >;
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
  // v3 sets carry a scene line where earlier ideas carried prose.
  ways: z.array(
    z.object({
      eyebrow: z.string(),
      title: z.string(),
      scene: z.string().default(''),
      outfit: z.string().default(''),
      details: z.string().default(''),
      accessories: z.string().default(''),
      tags: z.array(z.string()).default([]),
    }),
  ),
});
const StoredProposals = z
  .array(
    z.looseObject({
      name: z.string(),
      category: z.string().default(''),
      color: z.string().default(''),
      brand: z.string().default(''),
      key: z.string().default(''),
    }),
  )
  .catch([]);
const StoredStyling = z.record(z.string(), z.string()).catch({});
const isStoodOn = (v: string | null): v is StoodOn => v === 'twin' || v === 'cell' || v === 'robes';
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
        photo = await pieceReference(deps.storage, userId, piece.imageAssetId);
      }
    }
    const { styleIcons } = await deps.styling.context(userId);
    return {
      type: 'idea',
      id: ideaId,
      idx,
      feature: `${STYLE_FEATURE}.image`,
      capability: idx === 0 ? 'image.hero' : 'image.secondary',
      prompt: buildIdeaImagePrompt({
        wearer,
        pieceLabel: anchor.label,
        hasPiecePhoto: Boolean(photo),
        styleIcons,
        way: { ...way, outfit: way.outfit || way.scene },
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
    if (!found) throw new JobError('not_found');
    // She changed her model or the rack since asking: this render is no longer wanted.
    if (found.look.renderKey !== renderKey) throw new JobError('superseded');
    // Her twin when the render was asked for it: IMAGE 1 the twin, IMAGE 2 her close-up, and one
    // figure line (a reference carries a face, not proportions). Else the catalog cell.
    const references: { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: Uint8Array }[] =
      [];
    let gender: 'woman' | 'man' | null = null;
    let twinLine: { face: boolean; figure: string } | undefined;
    if (renderKey.startsWith('twin:')) {
      const src = await model.model(ctx.userId);
      const twin = src?.twinAssetId
        ? await deps.storage
            .getObject(mediaKeys.master(ctx.userId, src.twinAssetId))
            .catch(() => null)
        : null;
      if (src && twin) {
        const inputs = twinInputsOf(src);
        const face = inputs.closeUpAssetId
          ? await deps.storage
              .getObject(mediaKeys.master(ctx.userId, inputs.closeUpAssetId))
              .catch(() => null)
          : null;
        references.push({ mimeType: 'image/jpeg', data: twin });
        if (face) references.push({ mimeType: 'image/jpeg', data: face });
        gender = inputs.gender;
        twinLine = { face: face !== null, figure: twinFigureLine(twinSpec(inputs, face !== null)) };
      }
    } else {
      // The key names the catalog cell the render stands on (the cell she built by hand, or a
      // Robes model — plan 2026-11-05): `{cellId}@{style}:{rack}`.
      const key = renderKey.slice(0, renderKey.lastIndexOf(':'));
      const cellId = key.slice(0, key.lastIndexOf('@'));
      const cell = catalogKey(cellId) === key ? await model.cell(key) : undefined;
      const cellGender = catalogGender(cellId);
      const cellImage =
        cell?.status === 'ready' && cell.bucketKey
          ? await deps.storage.getObject(cell.bucketKey)
          : null;
      if (cellImage && cellGender) {
        references.push({
          mimeType: (cell?.contentType as 'image/jpeg' | 'image/png' | 'image/webp') ?? 'image/png',
          data: cellImage,
        });
        gender = cellGender;
      }
    }
    if (!gender) {
      await model.failRender(ctx.userId, lookId, renderKey);
      throw new JobError('model_not_ready');
    }
    const lookStyling = StoredStyling.parse(found.look.styling ?? {});
    const pieces = [];
    for (const p of found.pieces) {
      let photo: Uint8Array | null = null;
      if (
        references.length <= MAX_PIECE_REFERENCES &&
        p.imageAssetId &&
        p.assetStatus === 'ready'
      ) {
        photo = await pieceReference(deps.storage, ctx.userId, p.imageAssetId);
      }
      if (photo) references.push({ mimeType: 'image/jpeg', data: photo });
      pieces.push({
        name: p.label,
        category: p.category,
        color: p.color,
        brand: p.brand,
        hasImage: Boolean(photo),
        // How it is worn rides the garment line: a tuck renders as a tuck (legacy 2026-10-01).
        styled: lookStyling[p.id] ?? null,
        shape: shapeOf(p.shape),
        detail: detailOf(p.detail),
      });
    }
    if (pieces.length === 0) {
      await model.failRender(ctx.userId, lookId, renderKey);
      throw new JobError('empty_look');
    }
    const feature = RENDER_FEATURE;
    // What the picture was asked for is kept with the call, as a text call's is (SEC-82).
    const prompt = buildRenderPrompt(gender, pieces, twinLine, found.look.pictureNote);
    try {
      const { image, usage } = await deps.ai.generateImage({
        feature,
        capability: 'image.hero',
        prompt,
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
        prompt,
      });
      const assetId = await deps.styling.createGeneratedAsset(ctx.userId);
      const key = mediaKeys.original(ctx.userId, assetId);
      await deps.storage.putObject(key, image.data, { contentType: image.mimeType });
      await deps.onGenerated?.(key);
      // Not wanted any more (her model or rack changed, or she deleted her twin): its files go
      // with the maintenance sweep, never kept unheld.
      if (!(await model.setRender(ctx.userId, lookId, renderKey, assetId))) {
        await deps.styling.discardGenerated(ctx.userId, assetId);
      }
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
          prompt,
        });
      }
      await model.failRender(ctx.userId, lookId, renderKey);
      if (ctx.signal.aborted || (err instanceof AiError && err.code === 'cancelled')) throw err;
      throw new JobError(err instanceof AiError ? `ai_${err.code}` : 'render_failed');
    }
  }

  // Robes' frame of a look for the rack as it stands: re-dressed in place when the look has one
  // (frame mode — her model never replaces it), drawn fresh for a suggestion that has none yet.
  async function renderFrame(
    ctx: Parameters<JobHandler['run']>[0],
    lookId: string,
    frameKey: string,
  ) {
    const suggested = deps.suggested;
    if (!suggested) throw new JobError('unsupported');
    const found = await suggested.look(ctx.userId, lookId);
    if (!found) throw new JobError('not_found');
    if (found.look.renderKey !== `frame:${frameKey}`) throw new JobError('superseded');
    const styleCtx = await deps.styling.context(ctx.userId);
    const styling = StoredStyling.parse(found.look.styling ?? {});
    const proposals = StoredProposals.parse(found.look.proposals ?? []);
    const rack: (FrameRackPiece & { styled: string | null })[] = [
      ...found.pieces.map((p) => ({
        name: p.label,
        category: p.category ?? '',
        color: p.color ?? '',
        brand: p.brand ?? '',
        imageAssetId: p.assetStatus === 'ready' ? p.imageAssetId : null,
        styled: styling[p.id] ?? null,
        shape: shapeOf(p.shape),
        detail: detailOf(p.detail),
      })),
      ...proposals.map((p) => ({
        name: p.name,
        // A proposal filed as Other before it was read from its name (19 Nov) draws as what it is.
        category: categoryFromWords(p.category, p.name),
        color: p.color,
        brand: p.brand,
        imageAssetId: null,
        styled: styling[p.key] ?? null,
      })),
    ];
    if (rack.length === 0) {
      await suggested.failFrame(ctx.userId, lookId, frameKey);
      throw new JobError('empty_look');
    }
    const fail = async (err: unknown): Promise<never> => {
      await suggested.failFrame(ctx.userId, lookId, frameKey);
      if (ctx.signal.aborted || (err instanceof AiError && err.code === 'cancelled')) throw err;
      throw new JobError(err instanceof AiError ? `ai_${err.code}` : 'render_failed');
    };
    let assetId: string;
    // A frame drawn anew records what it stood on; a re-dressed frame keeps its first model.
    let stoodOn: StoodOn | null | undefined;
    let stoodOnCell: string | null = null;
    const frameDeps = {
      ai: deps.ai,
      storage: deps.storage,
      styling: deps.styling,
      ...(deps.model ? { cells: deps.model } : {}),
      ledger: deps.ledger,
      ...(deps.onGenerated ? { onGenerated: deps.onGenerated } : {}),
    };
    if (found.look.frameAssetId) {
      const frame = await deps.storage
        .getObject(mediaKeys.master(ctx.userId, found.look.frameAssetId))
        .catch(() => null);
      if (!frame) return fail(new Error('frame_missing'));
      const gender = styleCtx.gender === 'man' ? 'man' : 'woman';
      // The person comes from the model the frame stood on, never from the last picture alone: a
      // copy of a copy drifts (a Robes model aged ~25 years over a day of edits, 17 Nov).
      const recorded = isStoodOn(found.look.stoodOn) ? found.look.stoodOn : null;
      let anchor = await frameAnchor(frameDeps, ctx.userId, {
        on: recorded,
        cellId: found.look.stoodOnCell,
      });
      // shortcut: a frame from before `stood_on_cell` names only the kind of model; the model she
      // stands on now is taken when it is that kind, and recorded so later re-dresses keep it.
      if (!anchor && recorded && recorded !== 'twin') {
        const now = await modelReference(frameDeps, ctx.userId, {
          wearer: gender,
          index: found.look.setIndex ?? 0,
        });
        if (now.image && now.on === recorded) {
          anchor = now;
          stoodOn = now.on;
          stoodOnCell = now.cellId;
        }
      }
      const references: InlineImage[] = [{ mimeType: 'image/jpeg', data: frame }];
      if (anchor?.image) references.push(anchor.image);
      if (anchor?.image && anchor.face) references.push(anchor.face);
      const pieces = [];
      for (const p of rack) {
        let photo: Uint8Array | null = null;
        if (p.imageAssetId && references.length <= MAX_PIECE_REFERENCES) {
          photo = await pieceReference(deps.storage, ctx.userId, p.imageAssetId).catch(() => null);
        }
        if (photo) references.push({ mimeType: 'image/jpeg', data: photo });
        pieces.push({ ...p, hasImage: Boolean(photo) });
      }
      const prompt = buildFrameRenderPrompt(
        gender,
        pieces,
        found.look.pictureNote,
        anchor?.image ? { face: anchor.face !== null, figure: anchor.figure } : undefined,
      );
      try {
        const { image, usage } = await deps.ai.generateImage({
          feature: FRAME_FEATURE,
          capability: 'image.hero',
          prompt,
          references,
          aspectRatio: '4:5',
          signal: ctx.signal,
        });
        await deps.ledger.record({
          ...usage,
          jobId: ctx.jobId,
          userId: ctx.userId,
          feature: FRAME_FEATURE,
          status: 'ok',
          prompt,
        });
        assetId = await deps.styling.createGeneratedAsset(ctx.userId);
        const key = mediaKeys.original(ctx.userId, assetId);
        await deps.storage.putObject(key, image.data, { contentType: image.mimeType });
        await deps.onGenerated?.(key);
      } catch (err) {
        if (err instanceof AiError && err.usage) {
          await deps.ledger.record({
            ...err.usage,
            jobId: ctx.jobId,
            userId: ctx.userId,
            feature: FRAME_FEATURE,
            status: err.code === 'timeout' ? 'timeout' : 'error',
            prompt,
          });
        }
        return fail(err);
      }
    } else {
      const set = found.look.setId
        ? StoredSet.safeParse((await deps.styling.getSet(ctx.userId, found.look.setId))?.data)
        : null;
      const way = set?.success ? set.data.ways[found.look.setIndex ?? 0] : undefined;
      const anchor =
        set?.success && set.data.anchor.type === 'piece'
          ? await deps.styling.anchorPiece(ctx.userId, set.data.anchor.pieceId)
          : undefined;
      const piecePhoto = anchor?.imageAssetId
        ? await pieceReference(deps.storage, ctx.userId, anchor.imageAssetId).catch(() => null)
        : null;
      const wearer: 'woman' | 'man' = set?.success
        ? set.data.wearer
        : styleCtx.gender === 'man'
          ? 'man'
          : 'woman';
      try {
        const ref = await modelReference(frameDeps, ctx.userId, {
          wearer,
          index: found.look.setIndex ?? 0,
        });
        stoodOn = ref.on;
        stoodOnCell = ref.cellId;
        assetId = await drawSuggestedFrame(frameDeps, ctx, {
          wearer,
          mode: set?.success && set.data.mode === 'prompt' ? 'dress-me' : 'piece',
          fallback: set?.success ? set.data.fallback : false,
          pieceLabel: anchor?.label ?? null,
          piecePhoto,
          model: ref.image,
          face: ref.face,
          figure: ref.figure,
          styleIcons: styleCtx.styleIcons,
          brief: set?.success ? set.data.prompt : null,
          way: {
            title: found.look.name,
            eyebrow: way?.eyebrow ?? '',
            scene: way?.scene || found.look.name,
          },
          rack,
          capability: (found.look.setIndex ?? 0) === 0 ? 'image.hero' : 'image.secondary',
          pictureNote: found.look.pictureNote,
          setting: frameSetting(found.look.status, set?.success ? set.data : null),
        });
      } catch (err) {
        return fail(err);
      }
    }
    if (!(await suggested.setFrame(ctx.userId, lookId, frameKey, assetId, stoodOn, stoodOnCell))) {
      await deps.styling.discardGenerated(ctx.userId, assetId);
    }
    await ctx.writeStage('images', { images: [{ idx: 0, status: 'ready', assetId }] });
    return { status: 'succeeded' as const };
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
      if (input.target === 'frame') {
        await ctx.writeStage('text', { lookId: input.lookId });
        return renderFrame(ctx, input.lookId, input.frameKey);
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
