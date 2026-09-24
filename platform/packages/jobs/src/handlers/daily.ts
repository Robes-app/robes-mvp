import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  buildAnchorPrompt,
  buildSystem,
  buildUser,
  FEATURE,
  normalise,
  Output,
} from '@robes/ai/prompts/daily';
import { TodayGenerateInput } from '@robes/contracts';
import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { JobError, type JobHandler } from '../runtime';
import type { WeatherFor } from '../weather';

export interface DailyDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'putObject'>;
  styling: SystemRepositories['styling'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  weather: WeatherFor;
  // Frames are stored as uploads; AWS renders them from the S3 event, dev renders here.
  onGenerated?(key: string): Promise<void>;
  now?: () => Date;
}

// Her calendar date and month name; an unknown zone falls back rather than failing the job.
function localDay(now: Date, timezone: string): { date: string; month: string } {
  const read = (timeZone: string) => ({
    date: new Intl.DateTimeFormat('en-CA', { timeZone }).format(now),
    month: new Intl.DateTimeFormat('en-GB', { timeZone, month: 'long' }).format(now),
  });
  try {
    return read(timezone);
  } catch {
    return read('Europe/Dublin');
  }
}

// Style it for today (legacy /api/daily): the look as text first, then only the anchor frame
// eagerly — the other items render on demand (cost lever 1; legacy rendered every item).
export function createDailyHandler(deps: DailyDeps): JobHandler {
  const record = async (
    ctx: { jobId: string; userId: string },
    usage: Usage | undefined,
    status: 'ok' | 'error' | 'timeout',
    feature = FEATURE,
  ) => {
    if (usage)
      await deps.ledger.record({ ...usage, jobId: ctx.jobId, userId: ctx.userId, feature, status });
  };

  return {
    budgetMs: 150_000,
    async run(ctx) {
      const parsed = TodayGenerateInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const input = parsed.data;
      const her = await deps.styling.dailyContext(ctx.userId);
      const { date, month } = localDay(deps.now?.() ?? new Date(), her.timezone);
      const weather = await deps.weather({
        city: her.homeCity,
        lat: her.homeLat,
        lon: her.homeLon,
        date,
        month,
      });
      const brief = [input.occasion, input.prompt].filter(Boolean).join('. ');

      let text: { data: Output; usage: Usage };
      try {
        text = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'text.fast',
          system: buildSystem({
            firstName: her.firstName,
            gender: her.gender,
            styleIcons: her.styleIcons,
            styleDna: her.styleDna,
            closet: her.closet,
            ...(input.lockedPieceIds ? { lockedPieceIds: input.lockedPieceIds } : {}),
          }),
          user: buildUser(brief, weather),
          schema: Output,
          maxOutputTokens: 4800,
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

      const look = normalise(text.data, her.closet);
      if (!look) throw new JobError('empty_look');
      const dailyLookId = await deps.styling.createDailyLook(ctx.userId, {
        jobId: ctx.jobId,
        title: look.occasionLabel || look.headline || 'Today',
        subtitle: look.headline,
        data: {
          v: 1,
          look,
          weather: weather
            ? { city: weather.city, tempRange: weather.tempRange, condition: weather.condition }
            : null,
          images: [],
        },
      });
      await ctx.writeStage('text', { dailyLookId });

      const anchor = look.steps[0]?.items[0];
      if (!anchor) return { status: 'succeeded', artifactId: dailyLookId };
      const frame = {
        idx: anchor.imageIndex,
        assetId: null as string | null,
        status: 'failed' as 'ready' | 'failed',
      };
      await deps.styling.trackImage({
        jobId: ctx.jobId,
        userId: ctx.userId,
        idx: anchor.imageIndex,
        role: 'hero',
        assetId: null,
        status: 'pending',
      });
      try {
        const { image, usage } = await deps.ai.generateImage({
          feature: FEATURE,
          capability: 'image.hero',
          prompt: buildAnchorPrompt({
            gender: her.gender,
            look,
            styleIcons: her.styleIcons,
            city: weather?.city ?? her.homeCity,
          }),
          aspectRatio: '4:5',
          signal: ctx.signal,
        });
        await record(ctx, usage, 'ok', `${FEATURE}.image`);
        const assetId = await deps.styling.createGeneratedAsset(ctx.userId);
        const key = mediaKeys.original(ctx.userId, assetId);
        await deps.storage.putObject(key, image.data, { contentType: image.mimeType });
        await deps.onGenerated?.(key);
        frame.assetId = assetId;
        frame.status = 'ready';
      } catch (err) {
        if (err instanceof AiError) await record(ctx, err.usage, 'error', `${FEATURE}.image`);
        if (ctx.signal.aborted) throw err;
      }
      await deps.styling.trackImage({
        jobId: ctx.jobId,
        userId: ctx.userId,
        idx: anchor.imageIndex,
        role: 'hero',
        assetId: frame.assetId,
        status: frame.status,
      });
      await deps.styling.mergeIdeaData(ctx.userId, dailyLookId, { images: [frame] });
      await ctx.writeStage('images', { images: [frame] });
      return {
        status: frame.status === 'ready' ? 'succeeded' : 'partial',
        artifactId: dailyLookId,
      };
    },
  };
}
