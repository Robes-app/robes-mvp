import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { describe, expect, it } from 'vitest';
import { legacyRedirects } from './legacy-redirects';

// Resolves a legacy URL the way Next does: first matching source + `has`, params filled in.
function resolve(url: string): string | null {
  const { pathname, searchParams } = new URL(url, 'https://www.byrobes.com');
  const query = Object.fromEntries(searchParams);
  for (const r of legacyRedirects) {
    const params = getPathMatch(r.source)(pathname);
    if (!params) continue;
    const hasParams = matchHas({ headers: {} } as never, query, r.has, r.missing);
    if (!hasParams) continue;
    const all = { ...params, ...hasParams };
    return r.destination.replace(/:(\w+)/g, (_, k: string) => String(all[k]));
  }
  return null;
}

const APP = fileURLToPath(new URL('../app', import.meta.url));

// A destination must be a real page: route groups are transparent, `[x]` takes any segment.
function pageExists(path: string, dir = APP): boolean {
  const [seg, ...rest] = path.split('/').filter(Boolean);
  if (seg === undefined) return existsSync(join(dir, 'page.tsx'));
  const entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
  return entries.some((e) => {
    const next = join(dir, e.name);
    if (e.name.startsWith('(')) return pageExists(path, next);
    if (e.name === seg || /^\[[^.]+\]$/.test(e.name)) return pageExists(rest.join('/'), next);
    return false;
  });
}

describe('legacy redirects', () => {
  it.each([
    ['/dashboard', '/'],
    ['/dashboard?from=email', '/'],
    ['/dashboard?d=2026-10-23', '/plan/2026-10-23'],
    ['/dashboard?d=tomorrow', '/'],
    ['/index.html', '/'],
    ['/wardrobe?receipts=1', '/wardrobe/inbox'],
    ['/wishlist', '/wardrobe/wishlist'],
    ['/lookbook', '/looks'],
    [
      '/lookbook?open=0b6f2c1e-3d4a-4b5c-8d9e-0f1a2b3c4d5e',
      '/look/0b6f2c1e-3d4a-4b5c-8d9e-0f1a2b3c4d5e',
    ],
    ['/lookbook?open=1729000000000', '/looks'],
    ['/inspiration', '/looks/ideas'],
    ['/moodboards', '/looks'],
    ['/moodboard/autumn-in-paris', '/looks'],
    ['/diary', '/plan'],
    ['/calendar', '/plan'],
    ['/settings', '/you'],
    ['/stylenotes?chapter=brief', '/you'],
    ['/signup', '/auth/sign-in'],
    ['/signup.html?mode=signin', '/auth/sign-in'],
    ['/reset', '/auth/sign-in'],
    ['/terms', '/legal/terms'],
    ['/privacy', '/legal/privacy'],
    ['/board/a1b2c3d4e5', '/share/a1b2c3d4e5'],
    ['/look/a1b2c3d4e5', '/'],
  ])('%s → %s', (from, to) => {
    expect(resolve(from)).toBe(to);
  });

  it.each([
    '/wardrobe',
    '/looks',
    '/onboarding',
    '/piece/0b6f2c1e-3d4a-4b5c-8d9e-0f1a2b3c4d5e',
    '/look/0b6f2c1e-3d4a-4b5c-8d9e-0f1a2b3c4d5e',
    '/admin',
    '/share/AbCdEfGhIjKlMnOpQrStUv',
  ])('leaves %s to the new app', (path) => {
    expect(resolve(path)).toBeNull();
    expect(pageExists(path)).toBe(true);
  });

  it('points every redirect at a page that exists, and none is permanent yet', () => {
    for (const r of legacyRedirects) {
      expect(pageExists(r.destination), r.destination).toBe(true);
      expect(r.permanent).toBe(false);
    }
  });
});
