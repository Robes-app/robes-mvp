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

// A product photo (SEC-40): a receipt line's or a pasted link's. The fetcher fetches it with the
// same guard and uploads it, undecoded, through a presigned form that can write only that photo's
// own key, so it still holds no credentials; the rendition pipeline then checks it like an upload.
// The reply says only how it went. The cap is the photo's, not the queue's: a shop's product shot
// runs to a few MB.
export const PHOTO_MAX_BYTES = 10_000_000;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PhotoFetchResult = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    contentType: z.enum(PHOTO_TYPES),
    bytes: z.number().int().positive().max(PHOTO_MAX_BYTES),
  }),
  z.object({ ok: z.literal(false), reason: z.string().regex(/^[a-z0-9_]{1,40}$/) }),
]);
export type PhotoFetchResult = z.infer<typeof PhotoFetchResult>;

// The presigned form a photo is uploaded through (`MediaStorage.presignPost`).
export const PhotoUpload = z.object({
  url: z.url().max(2048),
  fields: z
    .record(z.string().max(64), z.string().max(4096))
    .refine((f) => Object.keys(f).length <= 20),
});
export type PhotoUpload = z.infer<typeof PhotoUpload>;

// Only our bucket's own endpoint takes the bytes; locally (allowPrivate) that is MinIO.
function uploadTarget(raw: string, allowPrivate: boolean): URL | null {
  try {
    const url = new URL(raw);
    if (allowPrivate) return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
    return url.protocol === 'https:' && url.hostname.endsWith('.amazonaws.com') ? url : null;
  } catch {
    return null;
  }
}

// Shops still print http:// image addresses beside the https one; the fetch only goes over TLS.
const overTls = (url: string, allowPrivate: boolean): string =>
  allowPrivate ? url : url.replace(/^http:\/\//i, 'https://');

export async function fetchPhoto(
  url: string,
  upload: PhotoUpload,
  // localUpload: dev only, the form posts to MinIO on localhost.
  options: SafeFetchOptions & { localUpload?: boolean } = {},
): Promise<PhotoFetchResult> {
  const { localUpload, ...fetchOptions } = options;
  const target = uploadTarget(upload.url, (localUpload || options.allowPrivate) ?? false);
  if (!target) return { ok: false, reason: 'upload_target' };
  let res: Awaited<ReturnType<typeof safeFetch>>;
  try {
    res = await safeFetch(overTls(url, options.allowPrivate ?? false), {
      ...fetchOptions,
      kind: 'image',
      maxBytes: PHOTO_MAX_BYTES,
    });
  } catch (err) {
    return { ok: false, reason: err instanceof FetchRefused ? err.reason : 'network' };
  }
  const contentType = PHOTO_TYPES.find((t) => res.contentType.startsWith(t));
  if (!contentType || !res.bytes?.length) return { ok: false, reason: 'content_type' };
  const form = new FormData();
  for (const [k, v] of Object.entries(upload.fields)) form.append(k, v);
  form.append('Content-Type', contentType);
  form.append('file', new Blob([new Uint8Array(res.bytes)], { type: contentType }));
  try {
    const stored = await fetch(target, { method: 'POST', body: form, redirect: 'error' });
    await stored.body?.cancel();
    if (!stored.ok) return { ok: false, reason: `upload_${stored.status}` };
  } catch {
    return { ok: false, reason: 'upload_network' };
  }
  return { ok: true, contentType, bytes: res.bytes.length };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// fetch queue → fetcher: the job and the URL (the fetcher has no DB to look them up), and what
// to fetch: a product page (link import, the default) or a product photo with its upload form.
export type FetchRequest =
  | { jobId: string; url: string; kind: 'page' }
  | { jobId: string; url: string; kind: 'photo'; upload: PhotoUpload };

export function parseFetchRequest(body: string): FetchRequest | null {
  try {
    const v = JSON.parse(body) as {
      jobId?: unknown;
      url?: unknown;
      kind?: unknown;
      upload?: unknown;
    };
    if (typeof v.jobId !== 'string' || !UUID.test(v.jobId)) return null;
    if (typeof v.url !== 'string' || v.url.length > 2048) return null;
    if (v.kind === undefined || v.kind === 'page') {
      return { jobId: v.jobId, url: v.url, kind: 'page' };
    }
    if (v.kind !== 'photo') return null;
    const upload = PhotoUpload.safeParse(v.upload);
    return upload.success
      ? { jobId: v.jobId, url: v.url, kind: 'photo', upload: upload.data }
      : null;
  } catch {
    return null;
  }
}

// fetcher → jobs-interactive: whether a photo was stored, or why it couldn't be.
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
