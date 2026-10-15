import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, NoticedParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// "Not me": the noticed line goes.
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: NoticedParams,
  output: Deleted,
  rateLimit: { key: 'looks.noticed.delete', limit: 60, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.noticed.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
