import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  buildUser,
  FEATURE,
  Output,
  type PhotoPiece,
  SYSTEM,
  toPieces,
} from '@robes/ai/prompts/wardrobe-pieces';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';
import { waitFor } from '../wait';

export interface WardrobePiecesDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'copyObject'>;
  reads: SystemRepositories['photoReads'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // Dev stand-in for the S3 event → RenditionFn on each crop's original.
  onGenerated?: (key: string) => Promise<void>;
  assetWaitMs?: number;
  pollMs?: number;
}

const Input = z.object({ assetId: z.uuid() });

// What the job writes on its row: the read, each piece with the crop asset cut for it. The
// filing routes read it back server-side (itemDna and printed values included).
export type StoredReadPiece = PhotoPiece & { cropAssetId: string };

// Several pieces from one photograph (legacy /api/wardrobe/pieces, now a job): every piece with
// its box, a crop of its own and a match against her wardrobe.
export function createWardrobePiecesHandler(deps: WardrobePiecesDeps): JobHandler {
  const assetWaitMs = deps.assetWaitMs ?? 30_000;
  const pollMs = deps.pollMs ?? 500;

  return {
    budgetMs: 90_000,
    async run(ctx) {
      const input = Input.safeParse(ctx.input);
      if (!input.success) throw new JobError('invalid_input');
      const { assetId } = input.data;

      const source = await waitFor(
        () => deps.reads.source(ctx.userId, assetId),
        (a) => a?.status === 'pending',
        { timeoutMs: assetWaitMs, pollMs, signal: ctx.signal },
      );
      if (!source) throw new JobError('not_found');
      if (source.status !== 'ready') {
        throw new JobError(source.status === 'failed' ? 'unreadable_photo' : 'asset_not_ready');
      }
      const masterKey = mediaKeys.master(ctx.userId, assetId);
      const image = await deps.storage.getObject(masterKey);
      if (!image) throw new JobError('asset_missing');

      const closet = await deps.reads.closet(ctx.userId);
      let result: { data: Output; usage: Usage };
      try {
        result = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'vision.analyse',
          system: SYSTEM,
          user: buildUser(closet),
          images: [{ mimeType: 'image/jpeg', data: image }],
          schema: Output,
          maxOutputTokens: 4200,
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

      const pieces = toPieces(result.data, closet);
      // Each crop is its own upload of the master; RenditionFn cuts and renders it.
      const readPieces: StoredReadPiece[] = [];
      for (const piece of pieces) {
        const cropAssetId = await deps.reads.createCrop(ctx.userId, assetId, piece.box);
        const key = mediaKeys.original(ctx.userId, cropAssetId);
        await deps.storage.copyObject(masterKey, key);
        await deps.onGenerated?.(key);
        readPieces.push({ ...piece, cropAssetId });
      }
      await ctx.writeStage('text', {
        assetId,
        noItemDetected: readPieces.length === 0,
        readPieces,
      });
      return { status: readPieces.length === 0 ? 'partial' : 'succeeded' };
    },
  };
}
