import { BatchPiecesInput, BatchPiecesOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { createBatch } from '@/server/wardrobe';

export const POST = route({
  auth: 'user',
  flag: 'wardrobe.analyse',
  input: BatchPiecesInput,
  output: BatchPiecesOutput,
  status: 202,
  rateLimit: { key: 'wardrobe.batch', limit: 20, windowSeconds: 60 },
  handler: ({ user, input, req }) =>
    createBatch(
      verifiedUserId(user.id),
      input.assetIds,
      req.headers.get('traceparent') ?? undefined,
    ),
});
