import { Ok, RegisterPushTokenInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Registers this device for push; called after she allows notifications and on each app start.
export const PUT = route({
  auth: 'user',
  input: RegisterPushTokenInput,
  output: Ok,
  rateLimit: { key: 'me.pushTokens', limit: 30, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    await repos.pushTokens.register(verifiedUserId(user.id), input);
    return { ok: true as const };
  },
});
