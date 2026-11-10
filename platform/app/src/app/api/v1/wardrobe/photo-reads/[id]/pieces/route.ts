import { FilePieceInput, PhotoReadParams, Piece } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { filePiece } from '@/server/photo-reads';
import { route } from '@/server/route';

// Add piece on The Rack (Capture PRD 1c.8): one piece of her read, filed once with her edits.
export const POST = route({
  auth: 'user',
  input: FilePieceInput,
  params: PhotoReadParams,
  output: Piece,
  rateLimit: { key: 'wardrobe.photoRead.piece', limit: 60, windowSeconds: 60 },
  handler: ({ user, input, params }) => filePiece(verifiedUserId(user.id), params.id, input),
});
