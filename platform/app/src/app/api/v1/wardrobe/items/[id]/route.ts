import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, Piece, PieceParams, UpdatePieceInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { loadPiece } from '@/server/wardrobe';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: PieceParams,
  output: Piece,
  handler: ({ user, params }) => loadPiece(verifiedUserId(user.id), params.id),
});

export const PATCH = route({
  auth: 'user',
  input: UpdatePieceInput,
  params: PieceParams,
  output: Piece,
  rateLimit: { key: 'wardrobe.update', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const { heroPosition, hero, ...fields } = input;
    const updated = await repos.wardrobe.update(userId, params.id, fields);
    if (!updated) throw new ApiError('not_found');
    if (heroPosition !== undefined) await repos.wardrobe.setHero(userId, params.id, heroPosition);
    if (hero === false) await repos.wardrobe.setHero(userId, params.id, null);
    if (hero === true && updated.heroPosition === null) {
      const position = await repos.wardrobe.nextHeroPosition(userId);
      // The Hero Rack holds ten; the client says so (legacy __waHeroToggle).
      if (position === null) throw new ApiError('conflict');
      await repos.wardrobe.setHero(userId, params.id, position);
    }
    return loadPiece(userId, params.id);
  },
});

// Soft delete; the client shows Undo for ≥6s and calls /restore (UX-15).
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: PieceParams,
  output: Deleted,
  rateLimit: { key: 'wardrobe.delete', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.wardrobe.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
