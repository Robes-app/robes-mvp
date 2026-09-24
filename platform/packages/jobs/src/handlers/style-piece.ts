import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  type Anchor,
  buildImagePrompt,
  buildSystem,
  buildUser,
  FALLBACK_PIECE,
  FEATURE,
  Output,
} from '@robes/ai/prompts/style-piece';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';

export interface StylePieceDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
  styling: SystemRepositories['styling'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // Generated frames are stored as uploads; AWS renders them from the S3 event, dev renders here.
  onGenerated?(key: string): Promise<void>;
}

export const StylePieceInput = z.object({
  anchor: z.discriminatedUnion('type', [
    z.object({ type: z.literal('piece'), pieceId: z.uuid() }),
    z.object({ type: z.literal('text'), text: z.string().trim().min(2).max(300) }),
  ]),
  occasion: z.string().trim().max(120).optional(),
});

type Frame = { idx: number; assetId: string | null; status: 'ready' | 'failed' };

// Style a piece (legacy /api/style): three looks as text first, then one editorial frame each.
export function createStylePieceHandler(deps: StylePieceDeps): JobHandler {
  async function record(
    ctx: { jobId: string; userId: string },
    usage: Usage | undefined,
    status: 'ok' | 'error' | 'timeout',
    feature = FEATURE,
  ) {
    if (usage)
      await deps.ledger.record({ ...usage, jobId: ctx.jobId, userId: ctx.userId, feature, status });
  }

  return {
    budgetMs: 180_000,
    async run(ctx) {
      const parsed = StylePieceInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const { anchor: input, occasion } = parsed.data;

      const styleCtx = await deps.styling.context(ctx.userId);
      let anchor: Anchor;
      let piecePhoto: Uint8Array | null = null;
      if (input.type === 'piece') {
        const piece = await deps.styling.anchorPiece(ctx.userId, input.pieceId);
        if (!piece) throw new JobError('not_found');
        anchor = { type: 'piece', label: piece.label };
        if (piece.imageAssetId) {
          piecePhoto = await deps.storage.getObject(
            mediaKeys.master(ctx.userId, piece.imageAssetId),
          );
        }
      } else {
        anchor = { type: 'text', text: input.text };
      }

      // Stage A: the three looks as text (UX-02: visible in ~3 s).
      let text: { data: Output; usage: Usage };
      try {
        text = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'text.fast',
          system: buildSystem(styleCtx),
          user: buildUser(anchor, occasion),
          ...(piecePhoto
            ? { images: [{ mimeType: 'image/jpeg' as const, data: piecePhoto }] }
            : {}),
          schema: Output,
          maxOutputTokens: 2000,
          signal: ctx.signal,
        });
      } catch (err) {
        if (err instanceof AiError) {
          await record(ctx, err.usage, err.code === 'timeout' ? 'timeout' : 'error');
          if (err.code === 'cancelled') throw err;
          throw new JobError(`ai_${err.code}`);
        }
        throw err;
      }
      await record(ctx, text.usage, 'ok');

      const { fallback, wearer, ways } = text.data;
      const pieceLabel = fallback
        ? FALLBACK_PIECE
        : anchor.type === 'piece'
          ? anchor.label
          : anchor.text;
      const ideaId = await deps.styling.createIdea(ctx.userId, {
        jobId: ctx.jobId,
        title: pieceLabel,
        subtitle: ways.map((w) => w.title).join(' · '),
        data: {
          anchor:
            input.type === 'piece'
              ? { type: 'piece', pieceId: input.pieceId, label: pieceLabel }
              : { type: 'text', label: pieceLabel },
          fallback,
          wearer,
          ways,
          images: [],
          promptVersion: 1,
        },
      });
      await ctx.writeStage('text', { ideaId, fallback, wearer, ways });

      // Stage B: one frame per look, generated in parallel; the first look uses the hero model.
      const frames: Frame[] = await Promise.all(
        ways.map(async (way, idx): Promise<Frame> => {
          const capability = idx === 0 ? 'image.hero' : 'image.secondary';
          await deps.styling.trackImage({
            jobId: ctx.jobId,
            userId: ctx.userId,
            idx,
            role: idx === 0 ? 'hero' : 'still',
            assetId: null,
            status: 'pending',
          });
          try {
            const { image, usage } = await deps.ai.generateImage({
              feature: FEATURE,
              capability,
              prompt: buildImagePrompt({
                wearer,
                pieceLabel,
                hasPiecePhoto: Boolean(piecePhoto) && !fallback,
                styleIcons: styleCtx.styleIcons,
                way,
              }),
              ...(piecePhoto && !fallback
                ? { references: [{ mimeType: 'image/jpeg' as const, data: piecePhoto }] }
                : {}),
              aspectRatio: '4:5',
              signal: ctx.signal,
            });
            await record(ctx, usage, 'ok', `${FEATURE}.image`);
            const assetId = await deps.styling.createGeneratedAsset(ctx.userId);
            const key = mediaKeys.original(ctx.userId, assetId);
            await deps.storage.putObject(key, image.data, { contentType: image.mimeType });
            await deps.onGenerated?.(key);
            await deps.styling.trackImage({
              jobId: ctx.jobId,
              userId: ctx.userId,
              idx,
              role: idx === 0 ? 'hero' : 'still',
              assetId,
              status: 'ready',
            });
            return { idx, assetId, status: 'ready' };
          } catch (err) {
            if (err instanceof AiError) await record(ctx, err.usage, 'error', `${FEATURE}.image`);
            if (ctx.signal.aborted) throw err;
            await deps.styling.trackImage({
              jobId: ctx.jobId,
              userId: ctx.userId,
              idx,
              role: idx === 0 ? 'hero' : 'still',
              assetId: null,
              status: 'failed',
            });
            // UX-08: one failed frame never sinks the result.
            return { idx, assetId: null, status: 'failed' };
          }
        }),
      );
      await deps.styling.mergeIdeaData(ctx.userId, ideaId, { images: frames });
      await ctx.writeStage('images', { images: frames });
      return {
        status: frames.every((f) => f.status === 'ready') ? 'succeeded' : 'partial',
        artifactId: ideaId,
      };
    },
  };
}
