import { AiError, type AiProvider } from '@robes/ai';
import {
  buildCellPrompt,
  buildTwinPrompt,
  CELL_FEATURE,
  TWIN_FEATURE,
} from '@robes/ai/prompts/avatar';
import { twinInputsOf, twinKey, twinSpec } from '@robes/core/avatar';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';

export interface AvatarCellDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'putObject'>;
  cells: Pick<SystemRepositories['avatarCells'], 'get' | 'ready' | 'fail'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // Her twin (one reference image per account); absent where the runtime doesn't draw it.
  twin?: {
    storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
    model: Pick<SystemRepositories['modelRender'], 'model' | 'setTwin' | 'failTwin'>;
    styling: Pick<SystemRepositories['styling'], 'createGeneratedAsset'>;
    // Generated images land as uploads; AWS renders them from the S3 event, dev renders here.
    onGenerated?(key: string): Promise<void>;
  };
}

export const AvatarCellInput = z.object({
  cellKey: z.string().regex(/^[wm]-s[0-7]-h[0-4]-(hg|pe|re|it|ap|nt)(-(ll|lr|fl|fr))*@v[0-9]+$/),
});
// Input carries the key she asked for only; everything it is drawn from is read here (SEC-16).
export const AvatarTwinInput = z.object({
  target: z.literal('twin'),
  twinKey: z.string().regex(/^[0-9a-f]{24}$/),
});

const FORMAT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;

// One reference portrait per catalog cell, generated once for everyone (legacy avatar_cell).
export function createAvatarCellHandler(deps: AvatarCellDeps): JobHandler {
  // Her twin (legacy 2026-10-20): her close-up as IMAGE 1 for the face, her line in words.
  async function drawTwin(ctx: Parameters<JobHandler['run']>[0], wanted: string) {
    const twin = deps.twin;
    if (!twin) throw new JobError('unsupported');
    const row = await twin.model.model(ctx.userId);
    if (!row) throw new JobError('not_found');
    const inputs = twinInputsOf(row);
    // She changed something since asking: the newer ask draws it.
    if ((await twinKey(inputs)) !== wanted) throw new JobError('superseded');
    const face = inputs.closeUpAssetId
      ? await twin.storage
          .getObject(mediaKeys.master(ctx.userId, inputs.closeUpAssetId))
          .catch(() => null)
      : null;
    try {
      const { image, usage } = await deps.ai.generateImage({
        feature: TWIN_FEATURE,
        capability: 'image.hero',
        prompt: buildTwinPrompt(twinSpec(inputs, face !== null)),
        ...(face ? { references: [{ mimeType: 'image/jpeg' as const, data: face }] } : {}),
        aspectRatio: '4:5',
        signal: ctx.signal,
      });
      await deps.ledger.record({
        ...usage,
        jobId: ctx.jobId,
        userId: ctx.userId,
        feature: TWIN_FEATURE,
        status: 'ok',
      });
      const assetId = await twin.styling.createGeneratedAsset(ctx.userId);
      const key = mediaKeys.original(ctx.userId, assetId);
      await twin.storage.putObject(key, image.data, { contentType: image.mimeType });
      await twin.onGenerated?.(key);
      await twin.model.setTwin(ctx.userId, wanted, assetId);
      await ctx.writeStage('images', { images: [{ idx: 0, status: 'ready', assetId }] });
      return { status: 'succeeded' as const };
    } catch (err) {
      if (err instanceof AiError && err.usage) {
        await deps.ledger.record({
          ...err.usage,
          jobId: ctx.jobId,
          userId: ctx.userId,
          feature: TWIN_FEATURE,
          status: err.code === 'timeout' ? 'timeout' : 'error',
        });
      }
      await twin.model.failTwin(ctx.userId, wanted);
      if (ctx.signal.aborted || (err instanceof AiError && err.code === 'cancelled')) throw err;
      throw new JobError(err instanceof AiError ? `ai_${err.code}` : 'render_failed');
    }
  }

  return {
    budgetMs: 90_000,
    async run(ctx) {
      const asTwin = AvatarTwinInput.safeParse(ctx.input);
      if (asTwin.success) return drawTwin(ctx, asTwin.data.twinKey);
      const parsed = AvatarCellInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const { cellKey } = parsed.data;
      const current = await deps.cells.get(cellKey);
      if (current?.status === 'ready') return { status: 'succeeded' };
      const prompt = buildCellPrompt(cellKey.split('@')[0] ?? '');
      if (!prompt) throw new JobError('invalid_input');
      try {
        const { image, usage } = await deps.ai.generateImage({
          feature: CELL_FEATURE,
          capability: 'image.hero',
          prompt,
          aspectRatio: '4:5',
          signal: ctx.signal,
        });
        await deps.ledger.record({
          ...usage,
          jobId: ctx.jobId,
          userId: ctx.userId,
          feature: CELL_FEATURE,
          status: 'ok',
        });
        const key = mediaKeys.avatarCell(cellKey, FORMAT[image.mimeType]);
        await deps.storage.putObject(key, image.data, {
          contentType: image.mimeType,
          // Immutable per art-direction version; catalog/ is served unsigned and long-cached.
          cacheControl: 'public, max-age=31536000, immutable',
        });
        await deps.cells.ready(cellKey, key, image.mimeType);
        await ctx.writeStage('images', { images: [{ idx: 0, status: 'ready' }] });
        return { status: 'succeeded' };
      } catch (err) {
        if (err instanceof AiError && err.usage) {
          await deps.ledger.record({
            ...err.usage,
            jobId: ctx.jobId,
            userId: ctx.userId,
            feature: CELL_FEATURE,
            status: err.code === 'timeout' ? 'timeout' : 'error',
          });
        }
        await deps.cells.fail(cellKey);
        if (ctx.signal.aborted || (err instanceof AiError && err.code === 'cancelled')) throw err;
        throw new JobError(err instanceof AiError ? `ai_${err.code}` : 'render_failed');
      }
    },
  };
}
