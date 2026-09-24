import { DailyItemParams, EmptyInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { requestDailyItemRender } from '@/server/daily';
import { route } from '@/server/route';

// "Show it": renders one item of a daily look on demand (UX-09).
export const POST = route({
  auth: 'user',
  flag: 'today.generate',
  input: EmptyInput,
  params: DailyItemParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'today.looks.render', limit: 30, windowSeconds: 60 },
  handler: ({ user, req, params }) =>
    requestDailyItemRender(verifiedUserId(user.id), req, params.id, params.idx),
});
