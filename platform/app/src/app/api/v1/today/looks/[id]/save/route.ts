import { DailyLookParams, Look, SaveDailyLookInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { saveDailyLook } from '@/server/daily';
import { route } from '@/server/route';

// Naming today's look saves it as a Look.
export const POST = route({
  auth: 'user',
  input: SaveDailyLookInput,
  params: DailyLookParams,
  output: Look,
  status: 201,
  rateLimit: { key: 'today.looks.save', limit: 60, windowSeconds: 60 },
  handler: ({ user, input, params }) =>
    saveDailyLook(verifiedUserId(user.id), params.id, input.name),
});
