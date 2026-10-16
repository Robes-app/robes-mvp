import { z } from 'zod';
import { parseProduct } from './product';
import { FetchRefused, type SafeFetchOptions, safeFetch } from './safe-fetch';

export { isBlockedAddress } from './address';
export { type ParsedProduct, parseProduct } from './product';
export { checkUrl, FetchRefused, safeFetch } from './safe-fetch';

// What the isolated fetcher sends back (SEC-40): parsed metadata or a refusal code, never a page.
const text = (n: number) => z.string().max(n).nullable();
export const LinkFetchResult = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    product: z.object({
      label: z.string().min(1).max(120),
      brand: text(80),
      price: z.number().min(0).max(10_000_000).nullable(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .nullable(),
      imageUrl: z.url().max(2048).nullable(),
      sourceUrl: z.url().max(2048),
      retailer: text(120),
      title: text(200),
    }),
  }),
  z.object({ ok: z.literal(false), reason: z.string().regex(/^[a-z0-9_]{1,40}$/) }),
]);
export type LinkFetchResult = z.infer<typeof LinkFetchResult>;

export async function fetchLink(
  url: string,
  options: SafeFetchOptions = {},
): Promise<LinkFetchResult> {
  try {
    const page = await safeFetch(url, options);
    const product = parseProduct(page.body, page.url);
    return product ? { ok: true, product } : { ok: false, reason: 'no_product' };
  } catch (err) {
    return { ok: false, reason: err instanceof FetchRefused ? err.reason : 'network' };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// fetch queue → fetcher: the job and the URL (the fetcher has no DB to look them up).
export function parseFetchRequest(body: string): { jobId: string; url: string } | null {
  try {
    const v = JSON.parse(body) as { jobId?: unknown; url?: unknown };
    return typeof v.jobId === 'string' &&
      UUID.test(v.jobId) &&
      typeof v.url === 'string' &&
      v.url.length <= 2048
      ? { jobId: v.jobId, url: v.url }
      : null;
  } catch {
    return null;
  }
}

// fetcher → jobs-interactive: the job id plus the validated result.
export function parseLinkResultMessage(
  body: string,
): { jobId: string; linkResult: LinkFetchResult } | null {
  try {
    const v = JSON.parse(body) as { jobId?: unknown; linkResult?: unknown };
    if (typeof v.jobId !== 'string' || !UUID.test(v.jobId)) return null;
    const result = LinkFetchResult.safeParse(v.linkResult);
    return result.success ? { jobId: v.jobId, linkResult: result.data } : null;
  } catch {
    return null;
  }
}
