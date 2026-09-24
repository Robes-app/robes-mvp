import { EmptyInput, TripList } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { listTrips } from '@/server/trips';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: TripList,
  handler: ({ user }) => listTrips(verifiedUserId(user.id)),
});
