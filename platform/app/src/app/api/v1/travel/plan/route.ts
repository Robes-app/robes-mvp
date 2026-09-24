import { PlanTripInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { planTrip } from '@/server/trips';

// Plan a trip: starts the travel job; progress streams from /jobs/:id/events.
export const POST = route({
  auth: 'user',
  input: PlanTripInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'travel.plan', limit: 6, windowSeconds: 60 },
  handler: ({ user, req, input }) => planTrip(verifiedUserId(user.id), req, input),
});
