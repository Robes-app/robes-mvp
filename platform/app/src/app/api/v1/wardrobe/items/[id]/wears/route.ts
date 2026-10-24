import { EmptyInput, PieceParams, PieceWearPage } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// A piece's own record. A piece that is not hers has no days to show, which is the same answer
// as one she has never worn — so this never says whether it exists.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: PieceParams,
  output: PieceWearPage,
  rateLimit: { key: 'wardrobe.wears', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    const [items, counts] = await Promise.all([
      repos.wardrobe.wears(userId, params.id),
      repos.wardrobe.wearCounts(userId, [params.id]),
    ]);
    // Wears the piece carries that no dated row accounts for (a count kept before the dates were).
    const undated = Math.max(0, (counts.get(params.id) ?? 0) - items.length);
    return { items, undated };
  },
});
