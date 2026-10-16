import { ApiError } from '@robes/api';
import { LookParams, PinLookInput, PinnedEntries } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toEntries } from '@/server/plan';
import { route } from '@/server/route';

// Pin a look to one or many days ("Wear on a day").
export const POST = route({
  auth: 'user',
  input: PinLookInput,
  params: LookParams,
  output: PinnedEntries,
  status: 201,
  rateLimit: { key: 'plan.pin', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const ids = await repos.plan.pin(userId, params.id, [...new Set(input.dates)], {
      slot: input.slot,
      activity: input.activity,
    });
    if (!ids) throw new ApiError('not_found');
    const rows = (await Promise.all(ids.map((id) => repos.plan.get(userId, id)))).filter(
      (r) => r !== undefined,
    );
    return { entries: await toEntries(userId, rows) };
  },
});
