import { ApiError } from '@robes/api';
import { Look, LookParams, LookPhotoInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { imagesFull } from '@/server/look-images';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// A photograph joins the look's stack (Felix rebuild D13), behind the ones already there. The
// asset is read back as hers first, so an id that is not hers is not found rather than a
// database error; the same asset twice is the one row.
export const POST = route({
  auth: 'user',
  input: LookPhotoInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.images.add', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const asset = await repos.assets.getForUser(userId, input.assetId);
    if (asset?.kind !== 'look_photo') throw new ApiError('not_found');
    const row = await imagesFull(() => repos.looks.addImage(userId, params.id, input.assetId));
    return toLook(userId, row);
  },
});
