import { ApiError } from '@robes/api';
import { Look, LookParams, LookPhotoInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { imagesFull } from '@/server/look-images';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// Her own photograph of the look she wore, kept alongside Robes' picture of it. Since the stack
// (D13) it is `looks.images.add` with the new photograph brought to the front: the camera on a look
// means the one she just took. The asset is read back as hers first, so an id that is not hers is
// not found rather than a database error. Kept for the clients that still call it.
export const POST = route({
  auth: 'user',
  input: LookPhotoInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.photo', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const asset = await repos.assets.getForUser(userId, input.assetId);
    if (asset?.kind !== 'look_photo') throw new ApiError('not_found');
    const row = await imagesFull(() =>
      repos.looks.addImage(userId, params.id, input.assetId, { lead: true }),
    );
    return toLook(userId, row);
  },
});
