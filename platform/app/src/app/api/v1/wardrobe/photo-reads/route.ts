import { StartJobOutput, StartPhotoReadInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { startPhotoRead } from '@/server/photo-reads';
import { route } from '@/server/route';

// One photo → every piece in it (a job; progress over /jobs/:id/events).
export const POST = route({
  auth: 'user',
  flag: 'wardrobe.analyse',
  input: StartPhotoReadInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'wardrobe.photoRead', limit: 20, windowSeconds: 60 },
  handler: ({ user, input, req }) => startPhotoRead(verifiedUserId(user.id), req, input.assetId),
});
