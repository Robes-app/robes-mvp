import 'server-only';
import { ApiError } from '@robes/api';
import type { TodayWeather } from '@robes/contracts';
import { diaryWindow, monthLong } from '@robes/core/calendar';
import type { UserId } from '@robes/db';
import { createLiveWeather, createRangeWeather, createWeather } from '@robes/jobs';
import { repos } from './db';
import { addDays, todayIn } from './plan';

// One cache per server instance each, bounded (packages/jobs/src/weather.ts): the day's forecast
// keyed by place and day, the live reading by place for fifteen minutes, so a home mount or refocus
// never costs two Open-Meteo calls and the temperature now is never a day stale.
const weatherFor = createWeather();
const liveFor = createLiveWeather();
const rangeFor = createRangeWeather();

// Open-Meteo forecasts 16 days; past that there is nothing to say. Days gone by are read as far
// back as the diary home shows them (plan 2026-11-02).
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
  if (asked && (asked < diaryWindow(today).from || asked > addDays(today, FORECAST_DAYS))) {
    return null;
  }
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

export interface DiaryPlaceAt {
  city: string | null;
  lat: number | null;
  lon: number | null;
}

// The diary's weather, a window at a time (plan 2026-11-02): one Open-Meteo call per distinct place
// — her home, and each place she set on a day — never one per day. Days the forecast cannot reach
// are null; the live reading stays the masthead's (today.weather).
export async function loadDiaryWeather(
  days: readonly { date: string; place: DiaryPlaceAt | null }[],
  home: DiaryPlaceAt,
  window: { from: string; to: string },
): Promise<Map<string, TodayWeather>> {
  const placeKey = (p: DiaryPlaceAt) => `${p.lat ?? ''},${p.lon ?? ''},${p.city ?? ''}`;
  const places = new Map<string, DiaryPlaceAt>([[placeKey(home), home]]);
  for (const d of days) if (d.place) places.set(placeKey(d.place), d.place);
  const readings = new Map(
    await Promise.all(
      [...places.entries()].map(
        async ([key, p]) =>
          [key, await rangeFor({ ...p, from: window.from, to: window.to })] as const,
      ),
    ),
  );
  const out = new Map<string, TodayWeather>();
  for (const d of days) {
    const place = d.place ?? home;
    const day = readings.get(placeKey(place))?.get(d.date);
    out.set(
      d.date,
      day
        ? {
            city: place.city,
            tempRange: day.tempRange,
            condition: day.condition,
            nowC: null,
            code: day.code,
          }
        : null,
    );
  }
  return out;
}
