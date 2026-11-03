import { ApiError } from '@robes/api';
import { PinnedEntries, PlanDayParams, SetOotdInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { isFlagEnabled } from '@/server/flags';
import { toEntries, withoutTripLooks } from '@/server/plan';
import { route } from '@/server/route';

// Make a look the day's OOTD (design 3k's ★): it leads the day on home; the rest keep their order.
export const PUT = route({
  auth: 'user',
  input: SetOotdInput,
  params: PlanDayParams,
  output: PinnedEntries,
  rateLimit: { key: 'plan.ootd', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    if (!(await repos.plan.setOotd(userId, params.date, input.entryId))) {
      throw new ApiError('not_found');
    }
    const [rows, tripsOn] = await Promise.all([
      repos.plan.range(userId, params.date, params.date),
      isFlagEnabled('trips'),
    ]);
    return { entries: withoutTripLooks(await toEntries(userId, rows), tripsOn) };
  },
});
