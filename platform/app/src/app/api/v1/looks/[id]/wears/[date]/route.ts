import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, WearParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Undo a wear (the quiet undo after "Wear it today").
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: WearParams,
  output: Deleted,
  rateLimit: { key: 'looks.unwear', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.looks.unwear(verifiedUserId(user.id), params.id, params.date))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
