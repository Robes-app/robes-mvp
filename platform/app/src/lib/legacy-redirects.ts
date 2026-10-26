import type { NextConfig } from 'next';

type Redirect = Awaited<ReturnType<NonNullable<NextConfig['redirects']>>>[number];

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

// Legacy app paths (reference/legacy-features.md route map) → their new homes, so bookmarks,
// email links and the installed PWA (start_url /dashboard) keep working after cutover. Query
// strings pass through. Temporary (307) while a rollback to the legacy app is still possible.
// Order matters: the first match wins, so query-specific rules sit above their path's catch-all.
// Kept as-is (same path in the new app): /wardrobe, /looks, /onboarding, /piece/:id, /admin.
type Rule = [source: string, destination: string, has?: Redirect['has']];

const MAP: Rule[] = [
  // Home. Today is `/` when signed in; `?d=` opened a day page.
  ['/dashboard', '/plan/:d', [{ type: 'query', key: 'd', value: '(?<d>\\d{4}-\\d{2}-\\d{2})' }]],
  // The avatar menu's old Account details door (legacy 2026-09-30).
  ['/dashboard', '/you/account', [{ type: 'query', key: 'account', value: '1' }]],
  ['/dashboard', '/'],
  ['/index.html', '/'],
  ['/wardrobe', '/wardrobe/inbox', [{ type: 'query', key: 'receipts', value: '1' }]],
  ['/wishlist', '/wardrobe/wishlist'],
  ['/lookbook', `/look/:id`, [{ type: 'query', key: 'open', value: `(?<id>${UUID})` }]],
  // The borrowing / five-pieces mails opened the composer (`?new=1`, `&robes=1`).
  ['/lookbook', '/looks/new', [{ type: 'query', key: 'new', value: '1' }]],
  ['/lookbook', '/looks'],
  ['/inspiration', '/looks/ideas'],
  // Moodboards were hidden on beta and have no page of their own: the closest parent.
  ['/moodboards', '/looks'],
  ['/moodboard/:slug', '/looks'],
  ['/diary', '/plan'],
  ['/calendar', '/plan'],
  // Settings' deep links: the look_waiting mail and the twin door (`?page=twin`), the Style DNA
  // walk (`?walk=1`), and the brief chapter (`?chapter=brief`, now Observations). /stylenotes
  // 301'd to /settings with its query on beta, so both paths take the same rules.
  ...['/settings', '/stylenotes'].flatMap((path): Rule[] => [
    [path, '/you/model', [{ type: 'query', key: 'page', value: 'twin' }]],
    [path, '/you/style', [{ type: 'query', key: 'walk', value: '1' }]],
    [path, '/you/observations', [{ type: 'query', key: 'chapter', value: 'brief' }]],
    [path, '/you'],
  ]),
  // Sign-in is passwordless now, so a reset link lands on sign-in too.
  ['/signup', '/auth/sign-in'],
  ['/signup.html', '/auth/sign-in'],
  ['/reset', '/auth/sign-in'],
  ['/terms', '/legal/terms'],
  ['/privacy', '/legal/privacy'],
  // Legacy share links: migrated public shares keep their token (scripts/migrate transform.ts).
  ['/board/:token', '/share/:token'],
  // One-click unsubscribe links in mail sent by the legacy app (notify.js): their tokens are signed
  // with a key the new app doesn't hold, so they land on the switches she can change herself.
  ['/api/notify/unsub', '/you/notifications'],
  // The old production look store (10-hex ids, in memory, 48 h) is gone; new looks are uuids.
  ['/look/:id([0-9a-f]{10})', '/'],
];

export const legacyRedirects: Redirect[] = MAP.map(([source, destination, has]) => ({
  source,
  destination,
  permanent: false,
  ...(has ? { has } : {}),
}));
