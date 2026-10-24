import { ApiError } from '@robes/api';
import { Look, LookParams, LookPhotoInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// Her own photograph of the look she wore, kept alongside Robes' picture of it. The asset is
// read back as hers first, so an id that is not hers is not found rather than a database error.
export const POST = route({
  auth: 'user',
  input: LookPhotoInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.photo', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const asset = await repos.assets.getForUser(userId, input.assetId);
    if (!asset || asset.kind !== 'look_photo') throw new ApiError('not_found');
    return toLook(userId, await repos.looks.setPhoto(userId, params.id, input.assetId));
  },
});
