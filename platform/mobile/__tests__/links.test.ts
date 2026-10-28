/// <reference types="node" />
// The route walk below reads both apps' route folders from disk (jest runs under Node).
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { nativePath } from '../src/lib/links';

const ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const DAY = '2026-10-28';

// Every rule, by the web URL an email, a push or a universal link carries.
test.each([
  // Rows that rename a path.
  ['/looks/ideas', '/looks?tab=suggested'],
  [`/looks/ideas/${ID}`, `/idea/${ID}`],
  ['/looks/new/photo', '/looks/photo'],
  [`/looks/style/${ID}`, `/looks/job/${ID}`],
  [`/today/looks/${ID}`, `/today/look/${ID}`],
  [`/today/style/${ID}`, `/today/job/${ID}`],
  [`/plan/${DAY}`, `/day/${DAY}`],
  ['/wardrobe/wishlist', '/wardrobe?segment=wishlist'],
  ['/soon/trips', '/soon'],
  ['/auth/sign-in', '/sign-in'],
  // Paths both apps share pass through.
  ['/', '/'],
  ['/looks', '/looks'],
  ['/looks/new', '/looks/new'],
  ['/looks/style', '/looks/style'],
  [`/looks/deck/${ID}`, `/looks/deck/${ID}`],
  [`/look/${ID}`, `/look/${ID}`],
  [`/piece/${ID}`, `/piece/${ID}`],
  ['/plan', '/plan'],
  [`/day/${DAY}`, `/day/${DAY}`],
  ['/today/style', '/today/style'],
  ['/wardrobe', '/wardrobe'],
  ['/wardrobe/add', '/wardrobe/add'],
  ['/wardrobe/inbox', '/wardrobe/inbox'],
  ['/you/model', '/you/model'],
  ['/you/notifications', '/you/notifications'],
  [`/trip/${ID}`, `/trip/${ID}`],
  ['/onboarding', '/onboarding'],
])('%s → %s', (from, to) => {
  expect(nativePath(from)).toBe(to);
});

test('every way a link arrives: scheme, universal link, Expo Go, trailing slash', () => {
  expect(nativePath(`robes://looks/ideas/${ID}`)).toBe(`/idea/${ID}`);
  expect(nativePath(`robes://plan/${DAY}`)).toBe(`/day/${DAY}`);
  expect(nativePath(`robes://day/${DAY}`)).toBe(`/day/${DAY}`);
  expect(nativePath('robes://')).toBe('/');
  expect(nativePath(`https://staging.byrobes.com/plan/${DAY}?from=email`)).toBe(`/day/${DAY}`);
  expect(nativePath('https://staging.byrobes.com/wardrobe/wishlist/')).toBe(
    '/wardrobe?segment=wishlist',
  );
  expect(nativePath('https://staging.byrobes.com')).toBe('/');
  expect(nativePath('https://staging.byrobes.com?from=email')).toBe('/');
  expect(nativePath('exp://192.168.1.20:8090/--/looks/ideas')).toBe('/looks?tab=suggested');
  expect(nativePath(`/looks/ideas/${ID}/`)).toBe(`/idea/${ID}`);
  expect(nativePath('/you/#top')).toBe('/you');
});

test('the query keys a native screen reads ride along; the rest are dropped', () => {
  // Every email link carries ?from=email (packages/jobs notify/tick.ts).
  expect(nativePath('/wardrobe/add?from=email')).toBe('/wardrobe/add');
  expect(nativePath('/wardrobe/inbox?from=email')).toBe('/wardrobe/inbox');
  expect(nativePath('/looks?tab=suggested&from=email')).toBe('/looks?tab=suggested');
  expect(nativePath('/wardrobe/add?to=wishlist')).toBe('/wardrobe/add?to=wishlist');
  expect(nativePath(`/looks/new?pieceId=${ID}&utm_source=x`)).toBe(`/looks/new?pieceId=${ID}`);
  // A rule's own query wins over a link's.
  expect(nativePath('/looks/ideas?tab=saved')).toBe('/looks?tab=suggested');
  expect(nativePath('/looks?tab=a%20b')).toBe('/looks?tab=a%20b');
  expect(nativePath('/looks?tab=%E0%A4%A')).toBe('/looks');
});

test('a path neither app has falls through unchanged, to +not-found', () => {
  expect(nativePath('/nope')).toBe('/nope');
  expect(nativePath('robes://nope/deeper')).toBe('/nope/deeper');
  // A malformed id or date isn't rewritten into a native screen that would fail to load it.
  expect(nativePath('/plan/tomorrow')).toBe('/plan/tomorrow');
  expect(nativePath('/looks/ideas/not-an-id')).toBe('/looks/ideas/not-an-id');
  expect(nativePath('/today/looks/123')).toBe('/today/looks/123');
  // Web-only pages (they open in the browser; universal links shouldn't claim them).
  expect(nativePath('/share/abc')).toBe('/share/abc');
  expect(nativePath('/legal/terms')).toBe('/legal/terms');
});

// The completeness check: every page the web serves to a signed-in person maps to a native screen,
// so a new web page can't ship a link the app can't open.
const WEB = join(__dirname, '../../app/src/app');
const NATIVE = join(__dirname, '../src/app');
// Web pages with no native screen on purpose: shares and legal open in the browser, the rest are
// web-only tools or email landing pages.
const WEB_ONLY = [
  /^\/admin(\/|$)/,
  /^\/dev\//,
  /^\/share\//,
  /^\/legal\//,
  /^\/unsubscribe$/,
  /^\/waitlist\/confirm$/,
];

function files(dir: string, name: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return files(full, name);
    return name(entry) ? [full] : [];
  });
}

function urlOf(root: string, file: string): string {
  const parts = relative(root, file)
    .split(sep)
    .filter((p) => !/^\(.*\)$/.test(p));
  return `/${parts.join('/')}`;
}

const webPages = files(WEB, (f) => f === 'page.tsx').map((f) =>
  urlOf(WEB, f)
    .replace(/\/page\.tsx$/, '')
    .replace(/\[(id|jobId)\]/g, ID)
    .replace('[date]', DAY)
    .replace('[slug]', 'trips')
    .replace(/^$/, '/'),
);

const nativeRoutes = files(NATIVE, (f) => /\.tsx$/.test(f) && !/^[_+]/.test(f)).map((f) => {
  const path = urlOf(NATIVE, f)
    .replace(/\.tsx$/, '')
    .replace(/\/index$/, '');
  return new RegExp(`^${path.replace(/\[[^\]]+\]/g, '[^/]+') || '/'}$`);
});

test('the walk found both apps', () => {
  expect(webPages).toContain(`/plan/${DAY}`);
  expect(nativeRoutes.some((re) => re.test(`/day/${DAY}`))).toBe(true);
});

test.each(webPages.filter((p) => !WEB_ONLY.some((re) => re.test(p))))(
  'web %s opens a native screen',
  (page) => {
    const [route = ''] = nativePath(page).split('?');
    expect(nativeRoutes.some((re) => re.test(route))).toBe(true);
  },
);
