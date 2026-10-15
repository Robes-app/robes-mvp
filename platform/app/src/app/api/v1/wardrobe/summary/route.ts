import { EmptyInput, LEGACY_CATEGORY, WardrobeSummary } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// The category tabs: the categories she has pieces in, with their counts.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: WardrobeSummary,
  rateLimit: { key: 'wardrobe.summary', limit: 240, windowSeconds: 60 },
  handler: async ({ user }) => {
    const counts = await repos.wardrobe.categoryCounts(verifiedUserId(user.id));
    return {
      total: counts.reduce((n, c) => n + c.count, 0),
      categories: counts
        .filter((c) => c.count > 0)
        .map((c) => ({
          category: LEGACY_CATEGORY.catch('Other').parse(c.category),
          count: c.count,
        })),
    };
  },
});
