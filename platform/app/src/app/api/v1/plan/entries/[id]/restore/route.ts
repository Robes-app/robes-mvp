import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, PlanEntryParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: PlanEntryParams,
  output: Deleted,
  rateLimit: { key: 'plan.restore', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.plan.restore(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
