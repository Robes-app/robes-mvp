import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, PushTokenParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Sign-out: this device stops getting her notifications.
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: PushTokenParams,
  output: Deleted,
  rateLimit: { key: 'me.pushTokens.revoke', limit: 30, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.pushTokens.revoke(verifiedUserId(user.id), params.token))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
