import type { SystemRepositories } from '@robes/db';
import { z } from 'zod';
import { type LinkFetchResult, LinkFetchResult as Result } from '../link';
import { pageFields } from '../link/page-fields';
import type { JobLogger } from '../logger';
import { askForPhotos, type RequestPhoto } from '../receipts/photos';
import { JobError, type JobHandler } from '../runtime';

export interface LinkImportDeps {
  intake: SystemRepositories['inboxIntake'];
  // The product's photo goes to the isolated fetcher like a receipt line's (SEC-40). Without it
  // (the web's dev inline worker) the piece arrives without its photo.
  requestPhoto?: RequestPhoto;
  logger?: Pick<JobLogger, 'warn'>;
  // Dev only: fetch in-process (same SSRF guard). In AWS the isolated fetcher attaches `fetched`.
  fetchLink?: (url: string) => Promise<LinkFetchResult>;
}

export const LinkImportInput = z.object({
  url: z.url().max(2048),
  as: z.enum(['wardrobe', 'wishlist']),
  fetched: Result.optional(),
});

// Link import (SEC-40): turns the fetcher's parsed product into a held entry that Review opens by
// id (`inbox.get`); it never shows in the Inbox list, and nothing is filed until she reviews it.
// A page that can't be read throws, so a failed read leaves no entry and no piece behind.
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
      const page = {
        category: product.category,
        options: product.options,
        color: product.color,
        description: product.description,
      };
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
          // What the shop's words settle now (category, a stated composition, a named shade); the
          // photo read refines them, and they stand if it can't run.
          ...pageFields(page),
          // What the shop says of the piece, for its photo read.
          page,
        },
      });
      if (deps.requestPhoto && product.imageUrl) {
        // Review opens on the text; the photo lands after. One that isn't asked for (a queue
        // error) is settled by the job sweeper, and the piece keeps its text.
        try {
          await askForPhotos(
            { intake: deps.intake, requestPhoto: deps.requestPhoto },
            ctx.userId,
            inboxId,
          );
        } catch (err) {
          deps.logger?.warn(
            { reason: err instanceof Error ? err.message : 'unknown' },
            'link_photo_failed',
          );
        }
      }
      await ctx.writeStage('text', { inboxId, suggested: input.data.as, label: product.label });
      return { status: 'succeeded' };
    },
  };
}
