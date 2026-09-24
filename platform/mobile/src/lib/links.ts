// Links in push notifications and emails use the web's paths (robes://looks/ideas/:id), so one
// URL works everywhere; this maps them to native routes. Unknown paths stay as they are.
const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^\/looks\/ideas\/([0-9a-f-]{36})\/?$/i, (m) => `/idea/${m[1]}`],
  [/^\/look\/([0-9a-f-]{36})\/?$/i, (m) => `/look/${m[1]}`],
  [/^\/piece\/([0-9a-f-]{36})\/?$/i, (m) => `/piece/${m[1]}`],
  [/^\/plan\/?$/, () => '/plan'],
  [/^\/today\/looks\/([0-9a-f-]{36})\/?$/i, (m) => `/today/look/${m[1]}`],
];

// A full URL → its app path: Expo Go dev links (exp://host:port/--/you), universal links
// (https://app/looks/…) and the custom scheme (robes://looks/…, where "looks" parses as a host).
function toPath(input: string): string {
  const url = /^[a-z][a-z0-9+.-]*:\/\/(.*)$/i.exec(input);
  if (!url) return input;
  const rest = url[1] ?? '';
  const expo = rest.indexOf('/--/');
  if (expo >= 0) return rest.slice(expo + 3);
  if (/^https?:/i.test(input)) {
    const slash = rest.indexOf('/');
    return slash >= 0 ? rest.slice(slash) : '/';
  }
  if (/^exps?:/i.test(input)) return '/';
  return `/${rest.replace(/^\/+/, '')}`;
}

export function nativePath(pathOrUrl: string): string {
  const [bare = '/'] = toPath(pathOrUrl).split(/[?#]/);
  for (const [re, to] of RULES) {
    const m = bare.match(re);
    if (m) return to(m);
  }
  return bare.startsWith('/') ? bare : `/${bare}`;
}
