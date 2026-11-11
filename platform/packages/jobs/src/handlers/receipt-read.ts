import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  buildUser,
  FEATURE,
  Output,
  type PhotoRead,
  SYSTEM,
  toRead,
} from '@robes/ai/prompts/receipt-photo';
import { lineFields, type SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';
import { waitForMaster } from '../wait';

export interface ReceiptReadDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'head'>;
  intake: Pick<SystemRepositories['inboxIntake'], 'line' | 'applyPhotoRead'>;
  assets: Pick<SystemRepositories['assets'], 'get'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  assetWaitMs?: number;
  pollMs?: number;
}

export const ReceiptReadInput = z.object({
  inboxId: z.uuid(),
  index: z.number().int().min(0).max(59),
  assetId: z.uuid(),
  // Attached from the isolated fetcher's reply (SEC-40): whether the photo's bytes were stored.
  photo: z.object({ stored: z.boolean(), reason: z.string().max(60).optional() }).optional(),
});

// One receipt line's photo (legacy inbox.js visionPass): the fetcher stored its bytes as her own
// pending asset, the rendition pipeline checked them like any upload, and here the photograph
// names the piece. A photo that couldn't be fetched, rendered or read leaves the line as the
// receipt printed it: nothing a photo can't confirm is ever invented.
export function createReceiptReadHandler(deps: ReceiptReadDeps): JobHandler {
  const assetWaitMs = deps.assetWaitMs ?? 30_000;
  const pollMs = deps.pollMs ?? 500;

  return {
    budgetMs: 60_000,
    async run(ctx) {
      const input = ReceiptReadInput.safeParse(ctx.input);
      if (!input.success) throw new JobError('invalid_input');
      const { inboxId, index, assetId, photo } = input.data;
      const keep = async (stage: string): Promise<{ status: 'partial' }> => {
        await deps.intake.applyPhotoRead(ctx.userId, inboxId, index, null);
        await ctx.writeStage('text', { inboxId, index, photo: stage });
        return { status: 'partial' };
      };

      const line = await deps.intake.line(ctx.userId, inboxId, index);
      if (!line) throw new JobError('not_found');
      if (!photo?.stored) return keep(photo?.reason ?? 'not_fetched');

      const { row: asset, readable } = await waitForMaster(
        () => deps.assets.get(assetId),
        (a) => (a.userId === ctx.userId ? a.status : 'failed'),
        async () => (await deps.storage.head(mediaKeys.master(ctx.userId, assetId))) !== null,
        { timeoutMs: assetWaitMs, pollMs, signal: ctx.signal },
      );
      if (!asset || asset.userId !== ctx.userId || !readable) return keep('unreadable');
      const image = await deps.storage.getObject(mediaKeys.master(ctx.userId, assetId));
      if (!image) return keep('unreadable');

      let result: { data: Output; usage: Usage };
      try {
        result = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'vision.analyse',
          system: SYSTEM,
          user: buildUser({
            label: line.item.label,
            brand: line.item.brand ?? null,
            size: lineFields(line.item).size,
            retailer: line.retailer,
          }),
          images: [{ mimeType: 'image/jpeg', data: image }],
          schema: Output,
          maxOutputTokens: 1200,
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
          return keep(`ai_${err.code}`.slice(0, 40));
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

      const read: PhotoRead | null = toRead(result.data);
      // No piece in the photo (a banner, a logo): it isn't this line's photo, so it goes.
      if (!read) return keep('no_item');
      await deps.intake.applyPhotoRead(ctx.userId, inboxId, index, read);
      await ctx.writeStage('text', { inboxId, index, photo: 'read', label: read.label });
      return { status: 'succeeded' };
    },
  };
}
