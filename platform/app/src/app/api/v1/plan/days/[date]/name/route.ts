import { DayName, NameDayInput, PlanDayParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Her name for a day, with or without looks on it; null clears it.
export const PUT = route({
  auth: 'user',
  input: NameDayInput,
  params: PlanDayParams,
  output: DayName,
  rateLimit: { key: 'plan.nameDay', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    await repos.plan.nameDay(verifiedUserId(user.id), params.date, input.name);
    return { date: params.date, name: input.name };
  },
});
