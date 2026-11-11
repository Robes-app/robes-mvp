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

// A receipt line's product photo (SEC-40): the fetcher hands back the bytes, never decoded there.
// The cap keeps the reply, base64 in JSON, inside one SQS message (256 KiB); an email's product
// photo is a small thumbnail, and a bigger one is refused rather than read.
export const PHOTO_MAX_BYTES = 170_000;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PhotoFetchResult = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    contentType: z.enum(PHOTO_TYPES),
    data: z.base64().max(Math.ceil(PHOTO_MAX_BYTES / 3) * 4),
  }),
  z.object({ ok: z.literal(false), reason: z.string().regex(/^[a-z0-9_]{1,40}$/) }),
]);
export type PhotoFetchResult = z.infer<typeof PhotoFetchResult>;

export async function fetchPhoto(
  url: string,
  options: SafeFetchOptions = {},
): Promise<PhotoFetchResult> {
  try {
    const res = await safeFetch(url, { ...options, kind: 'image', maxBytes: PHOTO_MAX_BYTES });
    const contentType = PHOTO_TYPES.find((t) => res.contentType.startsWith(t));
    if (!contentType || !res.bytes?.length) return { ok: false, reason: 'content_type' };
    return { ok: true, contentType, data: res.bytes.toString('base64') };
  } catch (err) {
    return { ok: false, reason: err instanceof FetchRefused ? err.reason : 'network' };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// fetch queue → fetcher: the job and the URL (the fetcher has no DB to look them up), and what
// to fetch: a product page (link import, the default) or a receipt line's photo.
export function parseFetchRequest(
  body: string,
): { jobId: string; url: string; kind: 'page' | 'photo' } | null {
  try {
    const v = JSON.parse(body) as { jobId?: unknown; url?: unknown; kind?: unknown };
    if (v.kind !== undefined && v.kind !== 'page' && v.kind !== 'photo') return null;
    return typeof v.jobId === 'string' &&
      UUID.test(v.jobId) &&
      typeof v.url === 'string' &&
      v.url.length <= 2048
      ? { jobId: v.jobId, url: v.url, kind: v.kind ?? 'page' }
      : null;
  } catch {
    return null;
  }
}

// fetcher → jobs-interactive: a receipt photo's bytes, or why it couldn't be fetched.
export function parsePhotoResultMessage(
  body: string,
): { jobId: string; photoResult: PhotoFetchResult } | null {
  try {
    const v = JSON.parse(body) as { jobId?: unknown; photoResult?: unknown };
    if (typeof v.jobId !== 'string' || !UUID.test(v.jobId)) return null;
    const result = PhotoFetchResult.safeParse(v.photoResult);
    return result.success ? { jobId: v.jobId, photoResult: result.data } : null;
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
