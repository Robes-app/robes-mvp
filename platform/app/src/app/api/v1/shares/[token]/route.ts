import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, ShareParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Unshare: the link stops resolving at once; signed image URLs lapse within two hours.
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: ShareParams,
  output: Deleted,
  rateLimit: { key: 'shares.revoke', limit: 60, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.shares.revoke(verifiedUserId(user.id), params.token))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
