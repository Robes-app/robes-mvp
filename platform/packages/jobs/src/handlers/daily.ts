import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  buildAnchorPrompt,
  buildSystem,
  buildUser,
  type DailyPlace,
  FEATURE,
  normalise,
  Output,
  type Weather,
} from '@robes/ai/prompts/daily';
import { TodayGenerateInput } from '@robes/contracts';
import { readPlace } from '@robes/core/landscape';
import type { SystemRepositories, UserId } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';
import type { DestinationWeatherFor, WeatherFor } from '../weather';

export interface DailyDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'putObject'>;
  styling: SystemRepositories['styling'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  weather: WeatherFor;
  // The weather at a place she names in her brief (absent: her own weather only).
  destination?: DestinationWeatherFor;
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

export interface DailyPlan {
  system: string;
  user: string;
  closetIds: string[];
  weather: Weather | null;
  gender: DailyContext['gender'];
  styleIcons: string[];
  homeCity: string | null;
}

type DailyContext = Awaited<ReturnType<SystemRepositories['styling']['dailyContext']>>;

// Everything the model is asked, built server-side from her data (SEC-16). Shared by the
// interactive handler and the overnight batch so both send the same prompt.
export async function planDaily(
  deps: Pick<DailyDeps, 'styling' | 'weather' | 'destination' | 'now'>,
  userId: UserId,
  input: TodayGenerateInput,
): Promise<DailyPlan> {
  const her = await deps.styling.dailyContext(userId);
  const { date, month } = localDay(deps.now?.() ?? new Date(), her.timezone);
  const day = await deps.weather({
    city: her.homeCity,
    lat: her.homeLat,
    lon: her.homeLon,
    date,
    month,
  });
  // The prompt's fields only (the weather line's icon code stays off the stored plan).
  const weather: Weather | null = day && {
    city: day.city,
    month: day.month,
    tempRange: day.tempRange,
    condition: day.condition,
  };
  const brief = [input.occasion, input.prompt].filter(Boolean).join('. ');
  // Where her words put the day (daily v4): a place she names is read for its own weather, and the
  // frame's setting follows it.
  const read = readPlace(brief);
  const there =
    read.destination && deps.destination
      ? await deps.destination({
          name: read.destination,
          date,
          home: { city: her.homeCity, lat: her.homeLat, lon: her.homeLon },
          ...(deps.now ? { now: deps.now() } : {}),
        })
      : null;
  const place: DailyPlace = {
    read: { ...read, destination: there ? there.place : read.named ? read.destination : null },
    there,
  };
  const placeWeather: Weather | null = there
    ? { city: there.place, month, tempRange: there.tempRange, condition: there.condition }
    : place.read.destination
      ? { city: place.read.destination, month, tempRange: null, condition: null }
      : weather;
  return {
    system: buildSystem(
      {
        firstName: her.firstName,
        gender: her.gender,
        styleIcons: her.styleIcons,
        styleDna: her.styleDna,
        closet: her.closet,
        ...(input.lockedPieceIds ? { lockedPieceIds: input.lockedPieceIds } : {}),
      },
      place.read,
    ),
    user: buildUser(brief, weather, place, month),
    closetIds: her.closet.map((c) => c.id),
    weather: placeWeather,
    gender: her.gender,
    styleIcons: her.styleIcons,
    homeCity: her.homeCity,
  };
}

export const DAILY_MAX_OUTPUT_TOKENS = 4800;

// An overnight look carries its local date so Today finds it (M5 task 3).
const Overnight = z.object({ overnight: z.literal(true), date: z.iso.date() });

export interface DailyRun {
  jobId: string;
  userId: UserId;
  signal: AbortSignal;
  writeStage(stage: 'text' | 'images', output: Record<string, unknown>): Promise<void>;
}

// From the model's answer onwards: normalise, store the draft look, then the anchor frame —
// rendered here, or (overnight batch) handed to `deferAnchor` so a look_render job draws it.
export async function completeDaily(
  deps: DailyDeps,
  run: DailyRun,
  plan: Pick<DailyPlan, 'closetIds' | 'weather' | 'gender' | 'styleIcons' | 'homeCity'>,
  output: Output,
  opts: {
    rawInput: unknown;
    deferAnchor?: (dailyLookId: string, idx: number) => Promise<void>;
  },
): Promise<{ status: 'succeeded' | 'partial'; artifactId: string }> {
  const look = normalise(
    output,
    plan.closetIds.map((id) => ({ id })),
  );
  if (!look) throw new JobError('empty_look');
  const overnight = Overnight.safeParse(opts.rawInput);
  const weather = plan.weather;
  const dailyLookId = await deps.styling.createDailyLook(run.userId, {
    jobId: run.jobId,
    title: look.occasionLabel || look.headline || 'Today',
    subtitle: look.headline,
    data: {
      v: 1,
      look,
      weather: weather
        ? { city: weather.city, tempRange: weather.tempRange, condition: weather.condition }
        : null,
      images: [],
      ...(overnight.success ? { overnight: true, date: overnight.data.date } : {}),
    },
  });
  await run.writeStage('text', { dailyLookId });

  const anchor = look.steps[0]?.items[0];
  if (!anchor) return { status: 'succeeded', artifactId: dailyLookId };
  if (opts.deferAnchor) {
    await deps.styling.mergeIdeaData(run.userId, dailyLookId, {
      images: [{ idx: anchor.imageIndex, assetId: null, status: 'deferred', jobId: null }],
    });
    await opts.deferAnchor(dailyLookId, anchor.imageIndex);
    return { status: 'succeeded', artifactId: dailyLookId };
  }
  const frame = {
    idx: anchor.imageIndex,
    assetId: null as string | null,
    status: 'failed' as 'ready' | 'failed',
  };
  await deps.styling.trackImage({
    jobId: run.jobId,
    userId: run.userId,
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
        gender: plan.gender,
        look,
        styleIcons: plan.styleIcons,
        city: weather?.city ?? plan.homeCity,
      }),
      aspectRatio: '4:5',
      signal: run.signal,
    });
    await recordCall(deps, run, usage, 'ok', `${FEATURE}.image`);
    const assetId = await deps.styling.createGeneratedAsset(run.userId);
    const key = mediaKeys.original(run.userId, assetId);
    await deps.storage.putObject(key, image.data, { contentType: image.mimeType });
    await deps.onGenerated?.(key);
    frame.assetId = assetId;
    frame.status = 'ready';
  } catch (err) {
    if (err instanceof AiError) await recordCall(deps, run, err.usage, 'error', `${FEATURE}.image`);
    if (run.signal.aborted) throw err;
  }
  await deps.styling.trackImage({
    jobId: run.jobId,
    userId: run.userId,
    idx: anchor.imageIndex,
    role: 'hero',
    assetId: frame.assetId,
    status: frame.status,
  });
  await deps.styling.mergeIdeaData(run.userId, dailyLookId, { images: [frame] });
  await run.writeStage('images', { images: [frame] });
  return { status: frame.status === 'ready' ? 'succeeded' : 'partial', artifactId: dailyLookId };
}

export async function recordCall(
  deps: Pick<DailyDeps, 'ledger'>,
  run: { jobId: string; userId: string },
  usage: Usage | undefined | null,
  status: 'ok' | 'error' | 'timeout',
  feature = FEATURE,
): Promise<void> {
  if (usage) {
    await deps.ledger.record({ ...usage, jobId: run.jobId, userId: run.userId, feature, status });
  }
}

// Style it for today (legacy /api/daily): the look as text first, then only the anchor frame
// eagerly — the other items render on demand (cost lever 1; legacy rendered every item).
// Also the overnight fallback: an overnight job whose batch never landed runs here.
export function createDailyHandler(deps: DailyDeps): JobHandler {
  return {
    budgetMs: 150_000,
    async run(ctx) {
      const parsed = TodayGenerateInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const plan = await planDaily(deps, ctx.userId, parsed.data);
      let text: { data: Output; usage: Usage };
      try {
        text = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'text.fast',
          system: plan.system,
          user: plan.user,
          schema: Output,
          maxOutputTokens: DAILY_MAX_OUTPUT_TOKENS,
          signal: ctx.signal,
        });
      } catch (err) {
        if (err instanceof AiError) {
          await recordCall(deps, ctx, err.usage, err.code === 'timeout' ? 'timeout' : 'error');
          if (err.code === 'cancelled') throw err;
          throw new JobError(`ai_${err.code}`);
        }
        throw err;
      }
      await recordCall(deps, ctx, text.usage, 'ok');
      return completeDaily(deps, ctx, plan, text.data, { rawInput: ctx.input });
    },
  };
}
