import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  assignDays,
  buildSystem,
  buildUser,
  correctiveNote,
  FEATURE,
  missingKeyPieces,
  type NormalEdit,
  normalise,
  Output,
  type TravelContext,
  type TripBrief,
  tripParams,
  underusedItems,
} from '@robes/ai/prompts/travel';
import { PlanTripInput } from '@robes/contracts';
import type { SystemRepositories } from '@robes/db';
import { JobError, type JobHandler } from '../runtime';
import type { TripWeatherFor } from '../weather';

export interface TravelDeps {
  ai: AiProvider;
  styling: Pick<SystemRepositories['styling'], 'dailyContext' | 'createTrip'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  tripWeather: TripWeatherFor;
}

// Plan a trip (legacy POST /api/travel): capsule + one look per plan, text only. The 1:3 rule and
// key pieces are validated and, as legacy, one corrective regeneration runs when they fail.
export function createTravelHandler(deps: TravelDeps): JobHandler {
  return {
    budgetMs: 240_000,
    async run(ctx) {
      const parsed = PlanTripInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const input = parsed.data;
      const her = await deps.styling.dailyContext(ctx.userId);
      const closetIds = new Set(her.closet.map((p) => p.id));
      const travel: TravelContext = {
        firstName: her.firstName,
        gender: her.gender,
        styleIcons: her.styleIcons,
        styleDna: her.styleDna,
        closet: her.closet,
        shortlistIds: input.anchorPieceIds.filter((id) => closetIds.has(id)),
      };
      const trip: TripBrief = {
        destination: input.destination,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        occasions: input.occasions,
        brief: input.brief,
        vibe: input.vibe,
      };
      const params = tripParams(trip, travel.shortlistIds.length);
      const weather = await deps.tripWeather({
        destination: input.destination,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      });
      const user = buildUser(trip, travel.shortlistIds.length, weather);

      const generate = async (note?: string): Promise<NormalEdit> => {
        let text: { data: Output; usage: Usage };
        try {
          text = await deps.ai.generateJson({
            feature: FEATURE,
            capability: 'text.fast',
            system: buildSystem(travel, trip, note),
            user,
            schema: Output,
            maxOutputTokens: 9000,
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
          ...text.usage,
          jobId: ctx.jobId,
          userId: ctx.userId,
          feature: FEATURE,
          status: 'ok',
        });
        return normalise(text.data, her.closet, params.capMax, input.destination);
      };

      const empty = (e: NormalEdit) => !e.capsule.length || !e.looks.length;
      const score = (e: NormalEdit) => ({
        under: underusedItems(e),
        missing: missingKeyPieces(e, travel.shortlistIds),
      });
      let edit = await generate();
      let s = score(edit);
      if (empty(edit) || s.under.length > 2 || s.missing.length) {
        const labels = s.missing.map((id) => her.closet.find((p) => p.id === id)?.label ?? id);
        const note = empty(edit) ? undefined : correctiveNote(edit, s.under, labels);
        try {
          const second = await generate(note);
          const s2 = score(second);
          if (
            !empty(second) &&
            (empty(edit) || s2.under.length + s2.missing.length < s.under.length + s.missing.length)
          ) {
            edit = second;
            s = s2;
          }
        } catch (err) {
          if (err instanceof AiError && err.code === 'cancelled') throw err;
          // Keep the first attempt, as legacy did.
        }
      }
      if (empty(edit)) throw new JobError('empty_trip');

      const lookDates = assignDays(edit.looks.length, input.dateFrom, params.tripDays);
      const tripId = await deps.styling.createTrip(ctx.userId, {
        jobId: ctx.jobId,
        title: edit.tripLabel,
        subtitle: edit.headline,
        data: {
          v: 1,
          trip: {
            destination: input.destination,
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            dateLine: params.dateLine,
            tripDays: params.tripDays,
          },
          weather,
          edit,
          lookDates,
          validation: { underused: s.under.length, missingKeyPieces: s.missing.length },
        },
      });
      await ctx.writeStage('text', { tripId });
      return { status: 'succeeded', artifactId: tripId };
    },
  };
}
