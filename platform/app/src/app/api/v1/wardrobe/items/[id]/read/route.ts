import { EmptyInput, Piece, PieceParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { rereadPiece } from '@/server/wardrobe';

// Try again (audit F3): a piece Robes couldn't read is read again from its photo; it is never
// discarded, whatever the read finds. Counts against the photo-read quota like any read.
export const POST = route({
  auth: 'user',
  flag: 'wardrobe.analyse',
  input: EmptyInput,
  params: PieceParams,
  output: Piece,
  rateLimit: { key: 'wardrobe.reread', limit: 20, windowSeconds: 60 },
  handler: ({ user, params, req }) =>
    rereadPiece(verifiedUserId(user.id), params.id, req.headers.get('traceparent') ?? undefined),
});
