import { AiError, type AiProvider } from '@robes/ai';
import { buildCellPrompt, CELL_FEATURE } from '@robes/ai/prompts/avatar';
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
}

export const AvatarCellInput = z.object({
  cellKey: z.string().regex(/^[wm]-s[0-7]-h[0-4]-(hg|pe|re|it|ap|nt)(-(ll|lr|fl|fr))*@v[0-9]+$/),
});

const FORMAT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;

// One reference portrait per catalog cell, generated once for everyone (legacy avatar_cell).
export function createAvatarCellHandler(deps: AvatarCellDeps): JobHandler {
  return {
    budgetMs: 90_000,
    async run(ctx) {
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
