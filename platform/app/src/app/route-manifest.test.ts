import { globSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Every public route must be listed here AND in docs/api.md §3.
const PUBLIC_ROUTES = new Set(['/api/v1/health']);
const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const here = dirname(fileURLToPath(import.meta.url));
const files = globSync('**/route.ts', { cwd: here });

function urlPath(file: string): string {
  const segments = dirname(file)
    .split('/')
    .filter((s) => s !== '.' && !/^\(.*\)$/.test(s));
  return `/${segments.join('/')}`;
}

describe('route manifest (SEC-01)', () => {
  it('finds routes', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s is built with route() and protected unless allow-listed', async (file) => {
    const path = urlPath(file);
    const mod = (await import(`./${file}`)) as Record<string, unknown>;
    for (const method of METHODS) {
      const handler = mod[method] as ((req: Request) => Promise<Response>) & { auth?: string };
      if (!handler) continue;
      expect(handler.auth, `${method} ${path} must use route()`).toBeDefined();
      if (handler.auth === 'public') {
        expect(PUBLIC_ROUTES.has(path), `${method} ${path} is public but not allow-listed`).toBe(
          true,
        );
        continue;
      }
      for (const authorization of [undefined, 'Bearer forged.token.value']) {
        const headers = authorization ? { authorization } : undefined;
        const res = await handler(new Request(`http://x${path}`, { method, headers }));
        expect(res.status, `${method} ${path} with ${authorization ?? 'no token'}`).toBe(401);
      }
    }
  });
});
