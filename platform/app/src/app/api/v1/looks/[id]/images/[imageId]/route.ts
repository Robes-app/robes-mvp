import { EmptyInput, Look, LookImageParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { keepsOneImage } from '@/server/look-images';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// A photograph leaves the stack; the rest close up. Robes' picture is not a row in the stack, so
// it can never be removed here (it is hidden instead, images/robes). A photograph that is not hers
// is not found, the same answer as one already gone; her last one stays while Robes' picture is
// hidden (409 look_needs_image, D19).
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: LookImageParams,
  output: Look,
  rateLimit: { key: 'looks.images.remove', limit: 60, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    const row = await keepsOneImage(() =>
      repos.looks.removeImage(userId, params.id, params.imageId),
    );
    return toLook(userId, row);
  },
});
