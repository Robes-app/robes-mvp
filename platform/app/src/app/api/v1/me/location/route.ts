import { Ok, UpdateLocationInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { saveDeviceLocation } from '@/server/location';
import { route } from '@/server/route';

// Her device location, sent once a session after she allowed it (web: lib/device-location.ts,
// native: lib/location.ts). Each call may reach Nominatim, so it is held to a few an hour.
export const POST = route({
  auth: 'user',
  input: UpdateLocationInput,
  output: Ok,
  rateLimit: { key: 'me.location', limit: 10, windowSeconds: 3600 },
  handler: ({ user, input }) => saveDeviceLocation(verifiedUserId(user.id), input),
});
