import { AiError, type AiProvider } from '@robes/ai';
import {
  buildCellPrompt,
  buildTwinPrompt,
  CELL_FEATURE,
  TWIN_FEATURE,
} from '@robes/ai/prompts/avatar';
import {
  CATALOG_KEY,
  isTwinCurrent,
  robesModelSpec,
  type TwinInputs,
  twinInputsOf,
  twinKey,
  twinSpec,
} from '@robes/core/avatar';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';
import { waitFor, waitForMaster } from '../wait';

export interface AvatarCellDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'putObject'>;
  cells: Pick<SystemRepositories['avatarCells'], 'get' | 'ready' | 'fail'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // Her twin (one reference image per account); absent where the runtime doesn't draw it.
  twin?: {
    storage: Pick<MediaStorage, 'head' | 'getObject' | 'putObject'>;
    model: Pick<
      SystemRepositories['modelRender'],
      'model' | 'setTwin' | 'failTwin' | 'closeUp' | 'colourRead' | 'standOnTwin'
    >;
    styling: Pick<SystemRepositories['styling'], 'createGeneratedAsset' | 'discardGenerated'>;
    // Generated images land as uploads; AWS renders them from the S3 event, dev renders here.
    onGenerated?(key: string): Promise<void>;
    // How long an early twin waits for her close-up's render, then for her colour read (tests).
    waits?: { photoMs: number; readMs: number; pollMs: number };
  };
}

const WAITS = { photoMs: 30_000, readMs: 90_000, pollMs: 1_000 };

export const AvatarCellInput = z.object({ cellKey: z.string().regex(CATALOG_KEY) });
// Input carries the key she asked for only; everything it is drawn from is read here (SEC-16).
export const AvatarTwinInput = z.object({
  target: z.literal('twin'),
  twinKey: z.string().regex(/^[0-9a-f]{24}$/),
  // Started with her colour read (10 Nov 2026): the new close-up, not yet on her profile,
  // and the read that puts it there. The twin is kept only if that read takes the photo as hers.
  early: z.object({ closeUpAssetId: z.uuid(), readJobId: z.uuid() }).optional(),
});
type Early = NonNullable<z.infer<typeof AvatarTwinInput>['early']>;

const FORMAT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;

// One reference portrait per catalog cell, generated once for everyone (legacy avatar_cell).
export function createAvatarCellHandler(deps: AvatarCellDeps): JobHandler {
  // Her twin (legacy 2026-10-20): her close-up as IMAGE 1 for the face, her line in words.
  async function drawTwin(ctx: Parameters<JobHandler['run']>[0], wanted: string, early?: Early) {
    const twin = deps.twin;
    if (!twin) throw new JobError('unsupported');
    const waits = twin.waits ?? WAITS;
    const row = await twin.model.model(ctx.userId);
    if (!row) throw new JobError('not_found');
    const inputs: TwinInputs = early
      ? { ...twinInputsOf(row), closeUpAssetId: early.closeUpAssetId }
      : twinInputsOf(row);
    // She changed something since asking: the newer ask draws it. (A key made before 10 Nov is
    // still hers, so an API deployed before this worker draws as it did.)
    if (!(await isTwinCurrent(wanted, inputs))) throw new JobError('superseded');
    if (early) {
      // Uploaded a moment ago: wait for its render, as her colour read does. Only her own close-up.
      const { readable } = await waitForMaster(
        () => twin.model.closeUp(ctx.userId, early.closeUpAssetId),
        (a) => a.status,
        async () =>
          (await twin.storage.head(mediaKeys.master(ctx.userId, early.closeUpAssetId))) !== null,
        { timeoutMs: waits.photoMs, pollMs: waits.pollMs, signal: ctx.signal },
      );
      if (!readable) {
        await twin.model.failTwin(ctx.userId, wanted);
        throw new JobError('unreadable_photo');
      }
    }
    const face = inputs.closeUpAssetId
      ? await twin.storage
          .getObject(mediaKeys.master(ctx.userId, inputs.closeUpAssetId))
          .catch(() => null)
      : null;
    // A twin started for her face is never drawn without it.
    if (early && !face) {
      await twin.model.failTwin(ctx.userId, wanted);
      throw new JobError('asset_missing');
    }
    try {
      const { image, usage } = await deps.ai.generateImage({
        feature: TWIN_FEATURE,
        capability: 'image.hero',
        prompt: buildTwinPrompt(twinSpec(inputs, face !== null)),
        ...(face ? { references: [{ mimeType: 'image/jpeg' as const, data: face }] } : {}),
        aspectRatio: '4:5',
        // Her face is a small region of a full-length frame and every render copies from it:
        // the twin is drawn at 2K (legacy twinGenerate), everything else stays 1K.
        imageSize: '2K',
        signal: ctx.signal,
      });
      await deps.ledger.record({
        ...usage,
        jobId: ctx.jobId,
        userId: ctx.userId,
        feature: TWIN_FEATURE,
        status: 'ok',
      });
      // Kept only once her colour read has taken the photo as hers and nothing else has changed:
      // no face, a failed read or a newer change throws this draw away.
      if (early) {
        const read = await waitFor(
          () => twin.model.colourRead(ctx.userId, early.readJobId),
          (r) => r === 'reading',
          { timeoutMs: waits.readMs, pollMs: waits.pollMs, signal: ctx.signal },
        );
        const now = read === 'read' ? await twin.model.model(ctx.userId) : undefined;
        if (!now || (await twinKey(twinInputsOf(now))) !== wanted) {
          throw new JobError('superseded');
        }
      }
      const assetId = await twin.styling.createGeneratedAsset(ctx.userId);
      const key = mediaKeys.original(ctx.userId, assetId);
      await twin.storage.putObject(key, image.data, { contentType: image.mimeType });
      await twin.onGenerated?.(key);
      const landed = await twin.model.setTwin(ctx.userId, wanted, assetId);
      // Not hers any more (she deleted her twin, or asked for another meanwhile): its files go
      // with the maintenance sweep, never kept unheld.
      if (!landed) await twin.styling.discardGenerated(ctx.userId, assetId);
      // The ask after her read may come once this twin is on file, too late to stand her on it.
      if (landed && early) await twin.model.standOnTwin(ctx.userId);
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
      if (err instanceof JobError) throw err;
      if (ctx.signal.aborted || (err instanceof AiError && err.code === 'cancelled')) throw err;
      throw new JobError(err instanceof AiError ? `ai_${err.code}` : 'render_failed');
    }
  }

  return {
    // An early twin also waits for her photo's render and her colour read.
    budgetMs: 180_000,
    async run(ctx) {
      const asTwin = AvatarTwinInput.safeParse(ctx.input);
      if (asTwin.success) return drawTwin(ctx, asTwin.data.twinKey, asTwin.data.early);
      const parsed = AvatarCellInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const { cellKey } = parsed.data;
      const current = await deps.cells.get(cellKey);
      if (current?.status === 'ready') return { status: 'succeeded' };
      // A Robes model (plan 2026-11-05) is drawn by the twin prompt with no face: its age and
      // size are words there; a picks cell keeps its own descriptor.
      const cellId = cellKey.split('@')[0] ?? '';
      const robes = robesModelSpec(cellId);
      const prompt = robes ? buildTwinPrompt(robes) : buildCellPrompt(cellId);
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
