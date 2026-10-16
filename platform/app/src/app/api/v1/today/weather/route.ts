import { EmptyInput, TodayWeather } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { loadTodayWeather } from '@/server/weather';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: TodayWeather,
  rateLimit: { key: 'today.weather', limit: 60, windowSeconds: 60 },
  handler: ({ user }) => loadTodayWeather(verifiedUserId(user.id)),
});
