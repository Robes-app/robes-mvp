import { ApiError } from '@robes/api';
import { EmptyInput, Piece, PieceParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { loadPiece } from '@/server/wardrobe';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: PieceParams,
  output: Piece,
  rateLimit: { key: 'wardrobe.restore', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    if (!(await repos.wardrobe.restore(userId, params.id))) throw new ApiError('not_found');
    return loadPiece(userId, params.id);
  },
});
