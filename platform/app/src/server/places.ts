import 'server-only';
import { ApiError } from '@robes/api';
import type { PlaceHits } from '@robes/contracts';
import { monthLong } from '@robes/core/calendar';
import type { UserId } from '@robes/db';
import { createPlaceSearch, createWeather } from '@robes/jobs';
import { repos } from './db';
import { todayIn } from './plan';

// One geocoder and one forecast cache per instance (weather.ts precedent): a query she types is
// answered once, and each hit's weather for the day is read once.
const placesFor = createPlaceSearch();
const weatherFor = createWeather();

// The place picker (Front Door design 3k): cities for what she typed, each with the asked day's
// range when the forecast reaches it. Her words go to Open-Meteo's geocoder and nothing else.
export async function searchPlaces(
  userId: UserId,
  q: string,
  date: string | undefined,
  now = new Date(),
): Promise<PlaceHits> {
  const profile = await repos.profiles.get(userId);
  if (!profile) throw new ApiError('not_found');
  const day = date ?? todayIn(profile.timezone, now);
  const found = await placesFor(q);
  const items = await Promise.all(
    found.map(async (p) => {
      const wx = await weatherFor({
        city: p.city,
        lat: p.lat,
        lon: p.lon,
        date: day,
        month: monthLong(day),
      });
      return {
        ...p,
        weather: wx?.tempRange ? { tempRange: wx.tempRange, code: wx.code } : null,
      };
    }),
  );
  return { items };
}
