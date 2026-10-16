import { EmptyInput, Today } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { loadToday } from '@/server/today';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: Today,
  rateLimit: { key: 'today.get', limit: 240, windowSeconds: 60 },
  handler: ({ user }) => loadToday(verifiedUserId(user.id)),
});
