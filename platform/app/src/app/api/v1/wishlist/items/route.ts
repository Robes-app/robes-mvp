import { ApiError } from '@robes/api';
import { CreateWishInput, ListWishesInput, Wish, WishPage } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { toWish, toWishes } from '@/server/wishlist';

export const GET = route({
  auth: 'user',
  input: ListWishesInput,
  output: WishPage,
  rateLimit: { key: 'wishlist.list', limit: 240, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const page = await repos.wishlist.list(userId, input);
    return { items: await toWishes(userId, page.items), nextCursor: page.nextCursor };
  },
});

export const POST = route({
  auth: 'user',
  input: CreateWishInput,
  output: Wish,
  status: 201,
  rateLimit: { key: 'wishlist.create', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    if (input.imageAssetId) {
      const asset = await repos.assets.getForUser(userId, input.imageAssetId);
      if (!asset || !['wishlist', 'wardrobe'].includes(asset.kind)) throw new ApiError('not_found');
    }
    return toWish(userId, await repos.wishlist.create(userId, input));
  },
});
