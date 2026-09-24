import { globSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

// Every public route must be listed here AND in docs/api.md §3.
const PUBLIC_ROUTES = new Set([
  '/api/v1/health',
  '/api/v1/public/shares/[token]',
  '/api/v1/public/unsub/[token]',
]);
// Handlers delegated to a vetted library with its own protections; keep this list tiny.
const DELEGATED_ROUTES = new Set(['/api/auth/[...all]']);
// The builders in @robes/api; each enforces auth, rate limits and schemas before the handler.
const BUILDERS = ['route', 'sseRoute'];
const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const here = dirname(fileURLToPath(import.meta.url));
const files = globSync('**/route.ts', { cwd: here });

function urlPath(file: string): string {
  const segments = dirname(file)
    .split('/')
    .filter((s) => s !== '.' && !/^\(.*\)$/.test(s));
  return `/${segments.join('/')}`;
}

let probe = 0;

describe('route manifest (SEC-01)', () => {
  // The first route import loads the whole server stack; pay that once, outside the per-route timeout.
  beforeAll(() => import('@/server/route'), 60_000);

  it('finds routes', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s is built with route() and protected unless allow-listed', async (file) => {
    const path = urlPath(file);
    if (DELEGATED_ROUTES.has(path)) return;
    const mod = (await import(`./${file}`)) as Record<string, unknown>;
    for (const method of METHODS) {
      const handler = mod[method] as ((req: Request) => Promise<Response>) & {
        auth?: string;
        builder?: string;
      };
      if (!handler) continue;
      expect(BUILDERS, `${method} ${path} must use route() or sseRoute()`).toContain(
        handler.builder,
      );
      expect(handler.auth, `${method} ${path} must declare auth`).toBeDefined();
      if (handler.auth === 'public') {
        expect(PUBLIC_ROUTES.has(path), `${method} ${path} is public but not allow-listed`).toBe(
          true,
        );
        continue;
      }
      for (const authorization of [undefined, 'Bearer forged.token.value']) {
        // Failed auth is throttled per IP (AUTH_FAILURE_LIMIT), so each probe is its own client.
        probe += 1;
        const headers: Record<string, string> = {
          'x-forwarded-for': `10.0.${Math.floor(probe / 250)}.${probe % 250}`,
          ...(authorization ? { authorization } : {}),
        };
        const res = await handler(new Request(`http://x${path}`, { method, headers }));
        expect(res.status, `${method} ${path} with ${authorization ?? 'no token'}`).toBe(401);
      }
    }
  });
});
