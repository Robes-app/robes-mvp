import { StartJobOutput, TodayGenerateInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { generateToday } from '@/server/daily';
import { route } from '@/server/route';

// Style it for today: starts the daily job; progress streams from /jobs/:id/events.
export const POST = route({
  auth: 'user',
  flag: 'today.generate',
  input: TodayGenerateInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'today.generate', limit: 10, windowSeconds: 60 },
  handler: ({ user, req, input }) => generateToday(verifiedUserId(user.id), req, input),
});
