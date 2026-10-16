import { ApiError } from '@robes/api';
import { GetPlanInput, Plan } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { loadPlan, todayIn } from '@/server/plan';
import { route } from '@/server/route';

// The rolling list (default 30 days from today in her timezone).
export const GET = route({
  auth: 'user',
  input: GetPlanInput,
  output: Plan,
  rateLimit: { key: 'plan.get', limit: 240, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    let from = input.from;
    if (!from) {
      const profile = await repos.profiles.get(userId);
      if (!profile) throw new ApiError('not_found');
      from = todayIn(profile.timezone);
    }
    return loadPlan(userId, from, input.days);
  },
});
