import { LEGACY_CATEGORY, WardrobeSummary, WardrobeSummaryInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// The category chips (the categories she has pieces in, with their counts under the sheet's
// filters — Front Door PRD rev 3 §7.1), every piece she owns (the dock's badge), and the Filter's
// choices (her brands, what she wears her pieces for).
export const GET = route({
  auth: 'user',
  input: WardrobeSummaryInput,
  output: WardrobeSummary,
  rateLimit: { key: 'wardrobe.summary', limit: 240, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const [counts, total, brands, wearFor] = await Promise.all([
      repos.wardrobe.categoryCounts(userId, input),
      repos.wardrobe.count(userId),
      repos.wardrobe.brands(userId),
      repos.wardrobe.wearLabels(userId),
    ]);
    return {
      brands,
      wearFor,
      total,
      categories: counts
        .filter((c) => c.count > 0)
        .map((c) => ({
          category: LEGACY_CATEGORY.catch('Other').parse(c.category),
          count: c.count,
        })),
    };
  },
});
