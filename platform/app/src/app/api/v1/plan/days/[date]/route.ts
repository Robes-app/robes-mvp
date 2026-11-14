import { DayCard, EmptyInput, PlanDayParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { loadDayCard } from '@/server/today';

// One day as the Diary's day card draws it: Home's day, for any date.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: PlanDayParams,
  output: DayCard,
  rateLimit: { key: 'plan.day', limit: 240, windowSeconds: 60 },
  handler: ({ user, params }) => loadDayCard(verifiedUserId(user.id), params.date),
});
