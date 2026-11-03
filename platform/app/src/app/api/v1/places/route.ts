import { PlaceHits, PlaceSearchInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { searchPlaces } from '@/server/places';
import { route } from '@/server/route';

// The place picker's search. Each call may reach Open-Meteo's geocoder and forecast, so it is held
// to a typing pace.
export const GET = route({
  auth: 'user',
  input: PlaceSearchInput,
  output: PlaceHits,
  rateLimit: { key: 'places.search', limit: 30, windowSeconds: 60 },
  handler: ({ user, input }) => searchPlaces(verifiedUserId(user.id), input.q, input.date),
});
