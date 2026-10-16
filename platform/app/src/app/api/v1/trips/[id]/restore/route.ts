import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, TripParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  flag: 'trips',
  input: EmptyInput,
  params: TripParams,
  output: Deleted,
  rateLimit: { key: 'trips.restore', limit: 60, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.trips.restore(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
