import { DailyLook, DailyLookParams, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadDailyLook } from '@/server/daily';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: DailyLookParams,
  output: DailyLook,
  handler: ({ user, params }) => loadDailyLook(verifiedUserId(user.id), params.id),
});
