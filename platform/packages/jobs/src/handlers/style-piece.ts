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
import { GenerateLookInput } from '@robes/contracts';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { JobError, type JobHandler } from '../runtime';

export interface StylePieceDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
  styling: SystemRepositories['styling'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // Generated frames are stored as uploads; AWS renders them from the S3 event, dev renders here.
  onGenerated?(key: string): Promise<void>;
}

// The API contract is the job input; the worker re-parses it (never trusts the row).
export const StylePieceInput = GenerateLookInput;

type Frame = {
  idx: number;
  assetId: string | null;
  status: 'ready' | 'failed' | 'deferred';
  jobId: string | null;
};

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

      // Stage B: only the hero frame renders now; the other looks render when she asks (UX-09,
      // cost lever 1 — POST /looks/ideas/:id/frames/:idx runs a look_render job).
      const renderHero = async (way: (typeof ways)[number]): Promise<Frame> => {
        const idx = 0;
        const capability = 'image.hero';
        await deps.styling.trackImage({
          jobId: ctx.jobId,
          userId: ctx.userId,
          idx,
          role: 'hero',
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
            role: 'hero',
            assetId,
            status: 'ready',
          });
          return { idx, assetId, status: 'ready', jobId: ctx.jobId };
        } catch (err) {
          if (err instanceof AiError) await record(ctx, err.usage, 'error', `${FEATURE}.image`);
          if (ctx.signal.aborted) throw err;
          await deps.styling.trackImage({
            jobId: ctx.jobId,
            userId: ctx.userId,
            idx,
            role: 'hero',
            assetId: null,
            status: 'failed',
          });
          // UX-08: a failed frame never sinks the result; she can ask for it again.
          return { idx, assetId: null, status: 'failed', jobId: ctx.jobId };
        }
      };
      const [hero] = ways;
      const frames: Frame[] = [
        ...(hero ? [await renderHero(hero)] : []),
        ...ways.slice(1).map(
          (_, i): Frame => ({
            idx: i + 1,
            assetId: null,
            status: 'deferred',
            jobId: null,
          }),
        ),
      ];
      await deps.styling.mergeIdeaData(ctx.userId, ideaId, { images: frames });
      await ctx.writeStage('images', { images: frames });
      return {
        // Hero ready is a finished idea; the deferred frames are hers to ask for.
        status: frames[0]?.status === 'ready' ? 'succeeded' : 'partial',
        artifactId: ideaId,
      };
    },
  };
}
