import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, UpdateWishInput, Wish, WishParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { toWish } from '@/server/wishlist';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: WishParams,
  output: Wish,
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    return toWish(userId, await repos.wishlist.get(userId, params.id));
  },
});

export const PATCH = route({
  auth: 'user',
  input: UpdateWishInput,
  params: WishParams,
  output: Wish,
  rateLimit: { key: 'wishlist.update', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    return toWish(userId, await repos.wishlist.update(userId, params.id, input));
  },
});

// Soft delete; the client offers Undo via /restore (UX-15).
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: WishParams,
  output: Deleted,
  rateLimit: { key: 'wishlist.delete', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.wishlist.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
