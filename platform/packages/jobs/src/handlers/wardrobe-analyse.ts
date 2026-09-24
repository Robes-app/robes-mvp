import { AiError, type AiProvider, type Usage } from '@robes/ai';
import { buildUser, FEATURE, Output, SYSTEM, toPiece } from '@robes/ai/prompts/wardrobe-analyse';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';

export interface WardrobeAnalyseDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject'>;
  pieces: SystemRepositories['pieces'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // How long to wait for the upload's renditions before giving up.
  assetWaitMs?: number;
  pollMs?: number;
}

const Input = z.object({ pieceId: z.uuid() });

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });
}

// Reads a wardrobe photo and files the piece (legacy /api/wardrobe/analyse, now a job).
export function createWardrobeAnalyseHandler(deps: WardrobeAnalyseDeps): JobHandler {
  const assetWaitMs = deps.assetWaitMs ?? 30_000;
  const pollMs = deps.pollMs ?? 500;

  return {
    budgetMs: 60_000,
    async run(ctx) {
      const input = Input.safeParse(ctx.input);
      if (!input.success) throw new JobError('invalid_input');
      const { pieceId } = input.data;

      // The batch can start before renditions exist; wait for them server-side.
      const deadline = Date.now() + assetWaitMs;
      let piece = await deps.pieces.forAnalysis(ctx.userId, pieceId);
      while (piece?.assetStatus === 'pending' && Date.now() < deadline) {
        await sleep(pollMs, ctx.signal);
        piece = await deps.pieces.forAnalysis(ctx.userId, pieceId);
      }
      if (!piece || !piece.imageAssetId) throw new JobError('not_found');
      if (piece.assetStatus !== 'ready') {
        await deps.pieces.markFailed(ctx.userId, pieceId);
        throw new JobError(piece.assetStatus === 'failed' ? 'unreadable_photo' : 'asset_not_ready');
      }

      // The master always exists (renditions never upscale small photos); media resolution fixes
      // the token cost regardless of pixel size.
      const image = await deps.storage.getObject(mediaKeys.master(ctx.userId, piece.imageAssetId));
      if (!image) throw new JobError('asset_missing');

      let result: { data: Output; usage: Usage };
      try {
        result = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'vision.analyse',
          system: SYSTEM,
          user: buildUser(),
          images: [{ mimeType: 'image/jpeg', data: image }],
          schema: Output,
          maxOutputTokens: 760,
          temperature: 0,
          signal: ctx.signal,
        });
      } catch (err) {
        if (err instanceof AiError) {
          if (err.usage) {
            await deps.ledger.record({
              ...err.usage,
              jobId: ctx.jobId,
              userId: ctx.userId,
              feature: FEATURE,
              status: err.code === 'timeout' ? 'timeout' : 'error',
            });
          }
          if (err.code === 'cancelled') throw err;
          await deps.pieces.markFailed(ctx.userId, pieceId);
          throw new JobError(`ai_${err.code}`);
        }
        throw err;
      }

      await deps.ledger.record({
        ...result.usage,
        jobId: ctx.jobId,
        userId: ctx.userId,
        feature: FEATURE,
        status: 'ok',
        response: result.data,
      });

      const analysed = toPiece(result.data);
      if (analysed.noItemDetected) {
        await deps.pieces.markFailed(ctx.userId, pieceId);
        await ctx.writeStage('text', { pieceId, noItemDetected: true });
        return { status: 'partial' };
      }
      const category = result.data.category;
      await deps.pieces.apply(ctx.userId, pieceId, { ...analysed, category });
      await ctx.writeStage('text', {
        pieceId,
        label: analysed.label,
        category: analysed.categoryL2 ?? category,
      });
      return { status: 'succeeded' };
    },
  };
}
