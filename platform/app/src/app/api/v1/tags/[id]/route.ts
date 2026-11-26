import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, TagParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// She deletes a tag: it leaves her list and comes off every look and piece that carried it.
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: TagParams,
  output: Deleted,
  rateLimit: { key: 'tags.delete', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.tags.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
