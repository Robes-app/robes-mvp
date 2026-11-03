import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  COLOUR_FEATURE,
  COLOUR_PROMPT,
  ColourOutput,
  SILHOUETTE_FEATURE,
  SILHOUETTE_PROMPT,
  SilhouetteOutput,
  USER,
  VERSION,
} from '@robes/ai/prompts/style-analyse';
import { buildColorHarmony, buildSilhouette } from '@robes/core/style-dna';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';
import { waitFor } from '../wait';

export interface StyleAnalyseDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject'>;
  profiles: SystemRepositories['styleAnalysis'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  assetWaitMs?: number;
  pollMs?: number;
}

export const StyleAnalyseInput = z.object({
  kind: z.enum(['colour', 'silhouette']),
  assetId: z.uuid(),
});

const PHOTO_KIND = { colour: 'headshot', silhouette: 'full_length' } as const;

// Colour or silhouette read from her photo → style profile (legacy /api/stylenotes/analyse).
export function createStyleAnalyseHandler(deps: StyleAnalyseDeps): JobHandler {
  return {
    budgetMs: 90_000,
    async run(ctx) {
      const input = StyleAnalyseInput.safeParse(ctx.input);
      if (!input.success) throw new JobError('invalid_input');
      const { kind, assetId } = input.data;

      const photo = await waitFor(
        () => deps.profiles.photo(ctx.userId, assetId),
        (p) => p?.status === 'pending',
        { timeoutMs: deps.assetWaitMs ?? 30_000, pollMs: deps.pollMs ?? 500, signal: ctx.signal },
      );
      if (!photo || photo.kind !== PHOTO_KIND[kind]) throw new JobError('not_found');
      if (photo.status !== 'ready') throw new JobError('unreadable_photo');
      const image = await deps.storage.getObject(mediaKeys.master(ctx.userId, assetId));
      if (!image) throw new JobError('asset_missing');

      const colour = kind === 'colour';
      const feature = colour ? COLOUR_FEATURE : SILHOUETTE_FEATURE;
      const record = (usage: Usage, status: 'ok' | 'error' | 'timeout') =>
        deps.ledger.record({ ...usage, jobId: ctx.jobId, userId: ctx.userId, feature, status });
      const read = async <T>(schema: z.ZodType<T>, system: string): Promise<T> => {
        try {
          // A once-per-user judgement call: worth the reasoning model (legacy led with Pro).
          const result = await deps.ai.generateJson({
            feature,
            capability: 'text.reasoning',
            system,
            user: USER,
            images: [{ mimeType: 'image/jpeg', data: image }],
            schema,
            // Thinking counts inside the cap: room for medium thinking and the full read.
            maxOutputTokens: 8192,
            temperature: 0,
            // Legacy ran this on Pro with a thinking budget: medium thinking, her photo at full
            // detail (staging's low-thinking read put a Clear Spring at low contrast, 28 Oct).
            deliberate: true,
            signal: ctx.signal,
          });
          await record(result.usage, 'ok');
          return result.data;
        } catch (err) {
          if (err instanceof AiError) {
            if (err.usage) await record(err.usage, err.code === 'timeout' ? 'timeout' : 'error');
            if (err.code === 'cancelled') throw err;
            throw new JobError(`ai_${err.code}`);
          }
          throw err;
        }
      };

      const modelVersion = `${feature}.v${VERSION}`;
      if (colour) {
        const data = await read(ColourOutput, COLOUR_PROMPT);
        if (data.no_face_detected) return noSubject(ctx, kind);
        const { render, dna } = buildColorHarmony(data);
        await deps.profiles.saveColour(ctx.userId, {
          season: dna.archetype_name,
          undertone: dna.verified_undertone,
          contrast: dna.calculated_contrast,
          dna,
          render,
          assetId,
          modelVersion,
        });
        await ctx.writeStage('text', { styleKind: kind, archetype: dna.archetype_name });
      } else {
        const data = await read(SilhouetteOutput, SILHOUETTE_PROMPT);
        if (data.no_person_detected) return noSubject(ctx, kind);
        const { render, dna } = buildSilhouette(data);
        await deps.profiles.saveSilhouette(ctx.userId, {
          bodyType: dna.body_type,
          dna,
          render,
          assetId,
          modelVersion,
        });
        await ctx.writeStage('text', { styleKind: kind, archetype: dna.body_type });
      }
      return { status: 'succeeded' };
    },
  };
}

// No face / no full figure: nothing is saved and she's asked for another photo.
async function noSubject(
  ctx: { writeStage(stage: 'text', output: Record<string, unknown>): Promise<void> },
  kind: 'colour' | 'silhouette',
) {
  await ctx.writeStage('text', { styleKind: kind, noSubject: true });
  return { status: 'partial' as const };
}
