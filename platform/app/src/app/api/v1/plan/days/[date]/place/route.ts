import { DayPlace, DayPlaceInput, PlanDayParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Where she is on a day (the prompt's place chip, "For Tuesday 3 only"); null puts her back home.
export const PUT = route({
  auth: 'user',
  input: DayPlaceInput,
  params: PlanDayParams,
  output: DayPlace,
  rateLimit: { key: 'plan.place', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    await repos.plan.setPlace(verifiedUserId(user.id), params.date, input.place);
    return { date: params.date, place: input.place };
  },
});
