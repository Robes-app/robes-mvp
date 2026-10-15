import { ApiError } from '@robes/api';
import { EmptyInput, TodayWeather } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { createWeather } from '@robes/jobs';
import { repos } from '@/server/db';
import { todayIn } from '@/server/plan';
import { route } from '@/server/route';

// The masthead's weather line (legacy H0): her home city's forecast for today, or null.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: TodayWeather,
  rateLimit: { key: 'today.weather', limit: 60, windowSeconds: 60 },
  handler: async ({ user }) => {
    const profile = await repos.profiles.get(verifiedUserId(user.id));
    if (!profile) throw new ApiError('not_found');
    const date = todayIn(profile.timezone);
    const wx = await createWeather()({
      city: profile.homeCity,
      lat: profile.homeLat === null ? null : Number(profile.homeLat),
      lon: profile.homeLon === null ? null : Number(profile.homeLon),
      date,
      month: new Date(`${date}T12:00:00Z`).toLocaleString('en-GB', { month: 'long' }),
    });
    return wx?.tempRange
      ? { city: wx.city, tempRange: wx.tempRange, condition: wx.condition ?? '' }
      : null;
  },
});
