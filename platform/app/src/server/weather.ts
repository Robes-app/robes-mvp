import 'server-only';
import { ApiError } from '@robes/api';
import type { TodayWeather } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { createWeather } from '@robes/jobs';
import { repos } from './db';
import { addDays, todayIn } from './plan';

// One cache per server instance, keyed by place and day and bounded (createWeather), so a home
// mount or refocus never costs two Open-Meteo calls.
const weatherFor = createWeather();

// Open-Meteo forecasts 16 days; past that, or before today, there is nothing to say.
const FORECAST_DAYS = 15;

// The weather line (legacy H0 and the day page): her home city's forecast for today or the
// asked date, or null.
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
  const wx = await weatherFor({
    city: profile.homeCity,
    lat: profile.homeLat === null ? null : Number(profile.homeLat),
    lon: profile.homeLon === null ? null : Number(profile.homeLon),
    date,
    month: new Date(`${date}T12:00:00Z`).toLocaleString('en-GB', { month: 'long' }),
  });
  return wx?.tempRange
    ? { city: wx.city, tempRange: wx.tempRange, condition: wx.condition ?? '' }
    : null;
}
