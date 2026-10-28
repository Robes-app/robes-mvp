import { ApiError } from '@robes/api';
import { Piece, PieceParams, PiecePhotoInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { loadPiece } from '@/server/wardrobe';

// Change photo (legacy __rbPiecePhotoPick): her new photograph replaces the piece's. What Robes
// read from the old one, and anything she has set, stays as it is — no re-read, no quota spent.
// The asset is read back as hers first, so an id that is not hers is not found.
export const POST = route({
  auth: 'user',
  input: PiecePhotoInput,
  params: PieceParams,
  output: Piece,
  rateLimit: { key: 'wardrobe.photo', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const asset = await repos.assets.getForUser(userId, input.assetId);
    if (asset?.kind !== 'wardrobe' || asset.status === 'failed') throw new ApiError('not_found');
    if (!(await repos.wardrobe.setPhoto(userId, params.id, input.assetId))) {
      throw new ApiError('not_found');
    }
    return loadPiece(userId, params.id);
  },
});
