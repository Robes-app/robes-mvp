import { Look, LookFromPhotoInput, PhotoReadParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { lookFromRead } from '@/server/photo-reads';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: LookFromPhotoInput,
  params: PhotoReadParams,
  output: Look,
  status: 201,
  rateLimit: { key: 'wardrobe.photoRead.look', limit: 30, windowSeconds: 60 },
  handler: ({ user, input, params }) => lookFromRead(verifiedUserId(user.id), params.id, input),
});
