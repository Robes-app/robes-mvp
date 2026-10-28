// Links in emails, push notifications and universal links carry the web's paths
// (robes://looks/ideas/:id, https://…/plan/2026-10-28?from=email), so one URL works everywhere;
// this maps them to native routes. Paths the two apps share (/look/:id, /piece/:id, /you/…,
// /wardrobe/add, /looks/deck/:id, /trip/…) pass through as they are, and a path neither app has
// falls through unchanged to +not-found. Every web page has a row here or a native twin at the
// same path — __tests__/links.test.ts walks app/src/app to keep it so.
const UUID = '([0-9a-f-]{36})';
const DATE = '(\\d{4}-\\d{2}-\\d{2})';

function rule(path: string, to: (m: RegExpMatchArray) => string): [RegExp, typeof to] {
  return [new RegExp(`^${path}$`, 'i'), to];
}

const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  // Ideas folded into the Lookbook's Suggested tab (web looks/ideas/page.tsx redirects there too).
  rule('/looks/ideas', () => '/looks?tab=suggested'),
  rule(`/looks/ideas/${UUID}`, (m) => `/idea/${m[1]}`),
  rule('/looks/new/photo', () => '/looks/photo'),
  rule(`/looks/style/${UUID}`, (m) => `/looks/job/${m[1]}`),
  rule(`/today/looks/${UUID}`, (m) => `/today/look/${m[1]}`),
  rule(`/today/style/${UUID}`, (m) => `/today/job/${m[1]}`),
  // The day page: web /plan/:date, native /day/:date. A malformed date falls to +not-found, as
  // the web 404s it.
  rule(`/plan/${DATE}`, (m) => `/day/${m[1]}`),
  // The Wishlist is a segment of the Wardrobe tab on native.
  rule('/wardrobe/wishlist', () => '/wardrobe?segment=wishlist'),
  rule('/soon/[a-z-]+', () => '/soon'),
  rule('/auth/sign-in', () => '/sign-in'),
];

// The query keys a native screen reads from a link; anything else (from=email, utm_…) is dropped
// so a stray key can't steer a screen.
const KEPT_PARAMS = new Set(['tab', 'to', 'pieceId']);

// A full URL → its app path: Expo Go dev links (exp://host:port/--/you), universal links
// (https://app/looks/…) and the custom scheme (robes://looks/…, where "looks" parses as a host).
function toPath(input: string): string {
  const url = /^[a-z][a-z0-9+.-]*:\/\/(.*)$/i.exec(input);
  if (!url) return input;
  const rest = url[1] ?? '';
  const expo = rest.indexOf('/--/');
  if (expo >= 0) return rest.slice(expo + 3);
  if (/^https?:/i.test(input)) {
    const slash = rest.search(/[/?#]/);
    if (slash < 0) return '/';
    return rest[slash] === '/' ? rest.slice(slash) : `/${rest.slice(slash)}`;
  }
  if (/^exps?:/i.test(input)) return '/';
  return `/${rest.replace(/^\/+/, '')}`;
}

// URLSearchParams is only partly implemented in React Native, so the query is split by hand.
function keptParams(query: string): Array<[string, string]> {
  const kept: Array<[string, string]> = [];
  for (const part of query.split('&')) {
    const [rawKey = '', rawValue = ''] = part.split('=');
    try {
      const key = decodeURIComponent(rawKey);
      if (KEPT_PARAMS.has(key)) kept.push([key, decodeURIComponent(rawValue.replace(/\+/g, ' '))]);
    } catch {
      // A malformed escape is a key Robes never sent; skip it.
    }
  }
  return kept;
}

export function nativePath(pathOrUrl: string): string {
  const path = toPath(pathOrUrl);
  const [beforeHash = ''] = path.split('#');
  const q = beforeHash.indexOf('?');
  const bare = q >= 0 ? beforeHash.slice(0, q) : beforeHash;
  const incoming = q >= 0 ? keptParams(beforeHash.slice(q + 1)) : [];

  let target = `/${bare.replace(/^\/+|\/+$/g, '')}`;
  for (const [re, to] of RULES) {
    const m = target.match(re);
    if (m) {
      target = to(m);
      break;
    }
  }

  const [route = '/', own = ''] = target.split('?');
  const params = own ? own.split('&').map((p) => p.split('=') as [string, string]) : [];
  for (const [key, value] of incoming) {
    if (!params.some(([k]) => k === key)) params.push([key, value]);
  }
  if (!params.length) return route;
  return `${route}?${params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`;
}
