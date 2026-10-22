import { TodayWeather, TodayWeatherInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { loadTodayWeather } from '@/server/weather';

export const GET = route({
  auth: 'user',
  input: TodayWeatherInput,
  output: TodayWeather,
  rateLimit: { key: 'today.weather', limit: 60, windowSeconds: 60 },
  handler: ({ user, input }) => loadTodayWeather(verifiedUserId(user.id), new Date(), input.date),
});
