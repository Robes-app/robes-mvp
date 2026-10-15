import { ApiError } from '@robes/api';
import { EmptyInput, Piece, WishParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { toPieces } from '@/server/wardrobe';

// "I bought this": the wish becomes a piece.
export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: WishParams,
  output: Piece,
  status: 201,
  rateLimit: { key: 'wishlist.promote', limit: 60, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    const row = await repos.wishlist.promote(userId, params.id);
    if (!row) throw new ApiError('not_found');
    const [piece] = await toPieces(userId, [row]);
    if (!piece) throw new ApiError('not_found');
    return piece;
  },
});
