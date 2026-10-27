import { ApiError } from '@robes/api';
import { CreatePieceInput, ListPiecesInput, Piece, PiecePage } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { loadPiece, toPieces } from '@/server/wardrobe';

export const GET = route({
  auth: 'user',
  input: ListPiecesInput,
  output: PiecePage,
  rateLimit: { key: 'wardrobe.list', limit: 240, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const { limit: _limit, cursor: _cursor, ...filters } = input;
    const [page, total] = await Promise.all([
      repos.wardrobe.list(userId, input),
      repos.wardrobe.countMatching(userId, filters),
    ]);
    return { items: await toPieces(userId, page.items), nextCursor: page.nextCursor, total };
  },
});

export const POST = route({
  auth: 'user',
  input: CreatePieceInput,
  output: Piece,
  status: 201,
  rateLimit: { key: 'wardrobe.create', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    if (input.imageAssetId) {
      const asset = await repos.assets.getForUser(userId, input.imageAssetId);
      if (!asset || asset.kind !== 'wardrobe') throw new ApiError('not_found');
    }
    // What she wears it for lives in the tag namespace, not on the row.
    const { wearFor, ...fields } = input;
    const piece = await repos.wardrobe.create(userId, { ...fields, acquiredVia: 'photo' });
    if (wearFor?.length) await repos.wardrobe.setWearTags(userId, piece.id, wearFor);
    return loadPiece(userId, piece.id);
  },
});
