import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, Trip, TripParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { loadTrip } from '@/server/trips';

export const GET = route({
  auth: 'user',
  flag: 'trips',
  input: EmptyInput,
  params: TripParams,
  output: Trip,
  handler: ({ user, params }) => loadTrip(verifiedUserId(user.id), params.id),
});

// Soft delete; the client offers Undo via /restore (UX-15).
export const DELETE = route({
  auth: 'user',
  flag: 'trips',
  input: EmptyInput,
  params: TripParams,
  output: Deleted,
  rateLimit: { key: 'trips.delete', limit: 60, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.trips.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
