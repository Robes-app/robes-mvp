import { EmptyInput, PinnedTrip, TripParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { pinTrip } from '@/server/trips';

// Pin every trip look to its day on her Plan; a repeat returns the looks already pinned.
export const POST = route({
  auth: 'user',
  flag: 'trips',
  input: EmptyInput,
  params: TripParams,
  output: PinnedTrip,
  rateLimit: { key: 'trips.pin', limit: 30, windowSeconds: 60 },
  handler: ({ user, params }) => pinTrip(verifiedUserId(user.id), params.id),
});
