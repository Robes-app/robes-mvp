import { HomeLater, HomeLaterInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Later on a home step (legacy __rbHomeLater): the step stands down for a day.
export const POST = route({
  auth: 'user',
  input: HomeLaterInput,
  output: HomeLater,
  rateLimit: { key: 'me.home.later', limit: 30, windowSeconds: 60 },
  handler: async ({ user, input }) => ({
    snoozed: await repos.profiles.snoozeHome(verifiedUserId(user.id), input.step, new Date()),
  }),
});
