import type { NextConfig } from 'next';

type Redirect = Awaited<ReturnType<NonNullable<NextConfig['redirects']>>>[number];

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

// Legacy app paths (reference/legacy-features.md route map) → their new homes, so bookmarks,
// email links and the installed PWA (start_url /dashboard) keep working after cutover. Query
// strings pass through. Temporary (307) while a rollback to the legacy app is still possible.
// Order matters: the first match wins, so query-specific rules sit above their path's catch-all.
// Kept as-is (same path in the new app): /wardrobe, /looks, /onboarding, /piece/:id, /admin.
const MAP: [source: string, destination: string, has?: Redirect['has']][] = [
  // Home. Today is `/` when signed in; `?d=` opened a day page.
  ['/dashboard', '/plan/:d', [{ type: 'query', key: 'd', value: '(?<d>\\d{4}-\\d{2}-\\d{2})' }]],
  ['/dashboard', '/'],
  ['/index.html', '/'],
  ['/wardrobe', '/wardrobe/inbox', [{ type: 'query', key: 'receipts', value: '1' }]],
  ['/wishlist', '/wardrobe/wishlist'],
  ['/lookbook', `/look/:id`, [{ type: 'query', key: 'open', value: `(?<id>${UUID})` }]],
  ['/lookbook', '/looks'],
  ['/inspiration', '/looks/ideas'],
  // Moodboards were hidden on beta and have no page of their own: the closest parent.
  ['/moodboards', '/looks'],
  ['/moodboard/:slug', '/looks'],
  ['/diary', '/plan'],
  ['/calendar', '/plan'],
  ['/settings', '/you'],
  ['/stylenotes', '/you'],
  // Sign-in is passwordless now, so a reset link lands on sign-in too.
  ['/signup', '/auth/sign-in'],
  ['/signup.html', '/auth/sign-in'],
  ['/reset', '/auth/sign-in'],
  ['/terms', '/legal/terms'],
  ['/privacy', '/legal/privacy'],
  // Legacy share links: migrated public shares keep their token (scripts/migrate transform.ts).
  ['/board/:token', '/share/:token'],
  // The old production look store (10-hex ids, in memory, 48 h) is gone; new looks are uuids.
  ['/look/:id([0-9a-f]{10})', '/'],
];

export const legacyRedirects: Redirect[] = MAP.map(([source, destination, has]) => ({
  source,
  destination,
  permanent: false,
  ...(has ? { has } : {}),
}));
