import { EmptyInput, Look, LookImageParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// A photograph leaves the stack; the rest close up. Robes' picture is not a row in the stack, so
// it can never be removed here (D13: it is only ever redrawn). A photograph that is not hers is
// not found, the same answer as one already gone.
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: LookImageParams,
  output: Look,
  rateLimit: { key: 'looks.images.remove', limit: 60, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    return toLook(userId, await repos.looks.removeImage(userId, params.id, params.imageId));
  },
});
