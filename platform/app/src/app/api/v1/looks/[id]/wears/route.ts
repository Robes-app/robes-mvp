import { ApiError } from '@robes/api';
import { LookParams, Wear, WearInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// "Wear it" on a day: immutable, one per look per day; a repeat returns the same wear.
export const POST = route({
  auth: 'user',
  input: WearInput,
  params: LookParams,
  output: Wear,
  status: 201,
  rateLimit: { key: 'looks.wear', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const wear = await repos.looks.wear(verifiedUserId(user.id), params.id, input.wornOn);
    if (!wear) throw new ApiError('not_found');
    return Wear.parse({
      id: wear.id,
      lookId: wear.lookId,
      wornOn: wear.wornOn,
      pieceIds: wear.pieceIds,
    });
  },
});
