import { EmptyInput, Wish, WishParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { toWish } from '@/server/wishlist';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: WishParams,
  output: Wish,
  rateLimit: { key: 'wishlist.restore', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    return toWish(userId, await repos.wishlist.restore(userId, params.id));
  },
});
