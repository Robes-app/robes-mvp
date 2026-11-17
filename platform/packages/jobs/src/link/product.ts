// Product metadata from a shop page: JSON-LD `Product` first, Open Graph as the fallback.
// Plain-text parsing only (no DOM, no script execution); every field is capped.
export interface ParsedProduct {
  label: string;
  brand: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  retailer: string | null;
  title: string | null;
  // What the shop says of the piece, as hints for the photo read (never shown as-is): its own
  // category ("Cardigans"), colour, the variant's options ("Small / 100% Cashmere / Vibrant Pink")
  // and description, where the composition usually is.
  category: string | null;
  color: string | null;
  options: string | null;
  description: string | null;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' ',
};
function decode(s: string): string {
  return s
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+|#39);/gi, (m, e: string) => {
      if (e in ENTITIES) return ENTITIES[e] ?? m;
      if (e.startsWith('#x')) return String.fromCodePoint(Number.parseInt(e.slice(2), 16));
      if (e.startsWith('#')) return String.fromCodePoint(Number(e.slice(1)));
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

const clip = (s: unknown, n: number): string | null =>
  typeof s === 'string' && decode(s) ? decode(s).slice(0, n) : null;

function httpUrl(value: unknown, base: string): string | null {
  const raw = Array.isArray(value)
    ? value[0]
    : typeof value === 'object' && value
      ? (value as { url?: unknown }).url
      : value;
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(decode(raw), base);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString().slice(0, 2048) : null;
  } catch {
    return null;
  }
}

function priceOf(value: unknown): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(/[^\d.]/g, ''))
        : Number.NaN;
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
}

const currencyOf = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-Z]{3}$/.test(value.trim().toUpperCase())
    ? value.trim().toUpperCase()
    : null;

function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) =>
      new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
    const key = attr('property') ?? attr('name') ?? attr('itemprop');
    const content = attr('content');
    const k = (key?.[2] ?? key?.[3])?.toLowerCase();
    if (k && content && !out.has(k)) out.set(k, content[2] ?? content[3] ?? '');
  }
  return out;
}

type Json = Record<string, unknown>;
function findProduct(node: unknown): Json | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findProduct(n);
      if (hit) return hit;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const obj = node as Json;
  const type = obj['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes('Product') || types.includes('ProductGroup')) return obj;
  return findProduct(obj['@graph'] ?? null);
}

// Shopify and others publish a ProductGroup: the piece (name, brand, category, description) with
// its sizes and colours as variants carrying the offer and image. The variant is the one the link
// names (?variant=…), else the first.
function variantOf(group: Json, pageUrl: string): Json | null {
  const raw = group.hasVariant;
  const variants = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
    (v): v is Json => !!v && typeof v === 'object',
  );
  const id = new URL(pageUrl).searchParams.get('variant');
  const named = id
    ? variants.find((v) => {
        const offers = v.offers as Json | Json[] | undefined;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        return [v['@id'], v.url, offer?.url].some(
          (u) => typeof u === 'string' && u.includes(`variant=${id}`),
        );
      })
    : undefined;
  return named ?? variants[0] ?? null;
}

function jsonLdProduct(html: string): Json | null {
  const blocks = html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, body] of blocks) {
    try {
      const hit = findProduct(JSON.parse(body ?? ''));
      if (hit) return hit;
    } catch {
      // A broken block on the page just doesn't count.
    }
  }
  return null;
}

export function parseProduct(html: string, pageUrl: string): ParsedProduct | null {
  const doc = html.slice(0, 2_000_000);
  const meta = metaTags(doc);
  const title = clip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(doc)?.[1], 200);
  const found = jsonLdProduct(doc);
  const variant = found?.hasVariant ? variantOf(found, pageUrl) : null;
  // The group names the piece; the variant carries what she would buy.
  const product =
    found && variant
      ? { ...variant, ...found, offers: variant.offers, image: variant.image ?? found.image }
      : found;
  const offers = product?.offers;
  const offer = (Array.isArray(offers) ? offers[0] : offers) as Json | undefined;
  const brandNode = product?.brand;
  const brand =
    clip(typeof brandNode === 'object' && brandNode ? (brandNode as Json).name : brandNode, 80) ??
    clip(meta.get('product:brand') ?? meta.get('og:brand'), 80);
  const label =
    clip(product?.name, 120) ?? clip(meta.get('og:title'), 120) ?? title?.slice(0, 120) ?? null;
  if (!label) return null;
  return {
    label,
    brand,
    price: priceOf(
      offer?.price ??
        offer?.lowPrice ??
        meta.get('product:price:amount') ??
        meta.get('og:price:amount'),
    ),
    currency: currencyOf(
      offer?.priceCurrency ?? meta.get('product:price:currency') ?? meta.get('og:price:currency'),
    ),
    // Shops often print og:image as http:// beside its https twin.
    imageUrl: httpUrl(
      product?.image ?? meta.get('og:image:secure_url') ?? meta.get('og:image'),
      pageUrl,
    ),
    sourceUrl: pageUrl.slice(0, 2048),
    retailer:
      clip(meta.get('og:site_name'), 120) ?? new URL(pageUrl).hostname.replace(/^www\./, ''),
    title,
    category: clip(product?.category, 80),
    color: clip(variant?.color ?? product?.color, 60),
    options: clip(
      typeof variant?.name === 'string' && typeof found?.name === 'string'
        ? variant.name.replace(found.name, '').replace(/^\s*[-–:]\s*/, '')
        : null,
      160,
    ),
    description: clip(product?.description ?? meta.get('og:description'), 600),
  };
}
