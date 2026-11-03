import 'server-only';
import type { UpdateLocationInput } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { createReverseGeocode } from '@robes/jobs';
import { repos } from './db';
import { env } from './env';

// One geocoder per server instance (same precedent as weather.ts): its bounded cache keeps a
// returning device off Nominatim. Dev/e2e may point it at a stand-in; deployed envs can't.
const cityAt = createReverseGeocode({ url: env.REVERSE_GEOCODE_URL });

// Two decimals is ~1 km: all the forecast needs, and no more of where she is than that.
export const roundCoord = (n: number) => Math.round(n * 100) / 100;

// Her device location becomes her home for the weather. Without a name for the place, the
// coordinates still carry the forecast and the city she had stays.
export async function saveDeviceLocation(userId: UserId, input: UpdateLocationInput) {
  const lat = roundCoord(input.lat);
  const lon = roundCoord(input.lon);
  const city = await cityAt(lat, lon);
  await repos.profiles.update(userId, {
    homeLat: lat,
    homeLon: lon,
    ...(city ? { homeCity: city } : {}),
  });
  return { ok: true as const };
}
