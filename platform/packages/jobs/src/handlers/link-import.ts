import type { SystemRepositories } from '@robes/db';
import { z } from 'zod';
import { type LinkFetchResult, LinkFetchResult as Result } from '../link';
import { JobError, type JobHandler } from '../runtime';

export interface LinkImportDeps {
  intake: SystemRepositories['inboxIntake'];
  // Dev only: fetch in-process (same SSRF guard). In AWS the isolated fetcher attaches `fetched`.
  fetchLink?: (url: string) => Promise<LinkFetchResult>;
}

export const LinkImportInput = z.object({
  url: z.url().max(2048),
  as: z.enum(['wardrobe', 'wishlist']),
  fetched: Result.optional(),
});

// Link import (SEC-40): turns the fetcher's parsed product into a held Inbox row.
export function createLinkImportHandler(deps: LinkImportDeps): JobHandler {
  return {
    budgetMs: 30_000,
    async run(ctx) {
      const input = LinkImportInput.safeParse(ctx.input);
      if (!input.success) throw new JobError('invalid_input');
      const result =
        input.data.fetched ?? (deps.fetchLink ? await deps.fetchLink(input.data.url) : undefined);
      if (!result) throw new JobError('fetch_unavailable');
      if (!result.ok) throw new JobError(`fetch_${result.reason}`.slice(0, 60));
      const { product } = result;
      const inboxId = await deps.intake.fromLink(ctx.userId, {
        jobId: ctx.jobId,
        retailer: product.retailer,
        subject: product.title,
        item: {
          label: product.label,
          brand: product.brand,
          price: product.price,
          currency: product.currency,
          imageUrl: product.imageUrl,
          sourceUrl: product.sourceUrl,
        },
      });
      await ctx.writeStage('text', { inboxId, suggested: input.data.as, label: product.label });
      return { status: 'succeeded' };
    },
  };
}
