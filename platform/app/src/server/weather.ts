import 'server-only';
import { ApiError } from '@robes/api';
import type { TodayWeather } from '@robes/contracts';
import { monthLong } from '@robes/core/calendar';
import type { UserId } from '@robes/db';
import { createLiveWeather, createWeather } from '@robes/jobs';
import { repos } from './db';
import { addDays, todayIn } from './plan';

// One cache per server instance each, bounded (packages/jobs/src/weather.ts): the day's forecast
// keyed by place and day, the live reading by place for fifteen minutes, so a home mount or refocus
// never costs two Open-Meteo calls and the temperature now is never a day stale.
const weatherFor = createWeather();
const liveFor = createLiveWeather();

// Open-Meteo forecasts 16 days; past that, or before today, there is nothing to say.
const FORECAST_DAYS = 15;

// The weather line (legacy H0 and the day page): her home city's weather for today — live, the
// temperature and conditions now (beta's current=…) — or the asked date's forecast, or null.
export async function loadTodayWeather(
  userId: UserId,
  now = new Date(),
  asked?: string,
): Promise<TodayWeather> {
  const profile = await repos.profiles.get(userId);
  if (!profile) throw new ApiError('not_found');
  const today = todayIn(profile.timezone, now);
  if (asked && (asked < today || asked > addDays(today, FORECAST_DAYS))) return null;
  const date = asked ?? today;
  const place = {
    city: profile.homeCity,
    lat: profile.homeLat === null ? null : Number(profile.homeLat),
    lon: profile.homeLon === null ? null : Number(profile.homeLon),
  };
  const [wx, live] = await Promise.all([
    weatherFor({
      ...place,
      date,
      month: monthLong(date),
    }),
    date === today ? liveFor(place) : null,
  ]);
  if (!wx?.tempRange) return null;
  return {
    city: wx.city,
    tempRange: wx.tempRange,
    condition: wx.condition ?? '',
    nowC: live?.nowC ?? null,
    code: live?.code ?? wx.code ?? null,
  };
}
