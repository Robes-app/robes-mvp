import { Look, LookCoverInput, LookParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// The front of the stack (D13): one of her photographs leads the look and is its record, or Robes'
// picture does (`imageId: null`). Her photographs keep their order either way.
export const POST = route({
  auth: 'user',
  input: LookCoverInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.images.cover', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    return toLook(userId, await repos.looks.setCover(userId, params.id, input.imageId));
  },
});
