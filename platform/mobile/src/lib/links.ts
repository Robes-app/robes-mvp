// Links in push notifications and emails use the web's paths (robes://looks/ideas/:id), so one
// URL works everywhere; this maps them to native routes. Unknown paths stay as they are.
const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^\/looks\/ideas\/([0-9a-f-]{36})\/?$/i, (m) => `/idea/${m[1]}`],
  [/^\/look\/([0-9a-f-]{36})\/?$/i, (m) => `/look/${m[1]}`],
  [/^\/piece\/([0-9a-f-]{36})\/?$/i, (m) => `/piece/${m[1]}`],
  [/^\/plan\/?$/, () => '/plan'],
];

export function nativePath(pathOrUrl: string): string {
  let path = pathOrUrl;
  const scheme = /^robes:\/\/\/?(.*)$/.exec(pathOrUrl);
  if (scheme) path = `/${scheme[1] ?? ''}`;
  const [bare = '/'] = path.split('?');
  for (const [re, to] of RULES) {
    const m = bare.match(re);
    if (m) return to(m);
  }
  return bare.startsWith('/') ? bare : `/${bare}`;
}
