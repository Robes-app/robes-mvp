import { EmptyInput, LookParams, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { findLookPieces } from '@/server/photo-reads';
import { route } from '@/server/route';

// Find the pieces (Capture PRD 1c.5): the look's photograph → every piece in it (a job; progress
// over /jobs/:id/events). The same gate and limits as any photo read.
export const POST = route({
  auth: 'user',
  flag: 'wardrobe.analyse',
  input: EmptyInput,
  params: LookParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'wardrobe.photoRead', limit: 20, windowSeconds: 60 },
  handler: ({ user, params, req }) => findLookPieces(verifiedUserId(user.id), req, params.id),
});
