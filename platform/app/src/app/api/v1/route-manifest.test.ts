import { globSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Every public route must be listed here AND in docs/api.md §3.
const PUBLIC_ROUTES = new Set(['/api/v1/health']);
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const here = dirname(fileURLToPath(import.meta.url));
const files = globSync('**/route.ts', { cwd: here });

describe('API route manifest (SEC-01)', () => {
  it('finds routes', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s is built with route() and protected unless allow-listed', async (file) => {
    const path = `/api/v1/${dirname(relative('.', file))}`.replace(/\/\.$/, '');
    const mod = (await import(`./${file}`)) as Record<string, unknown>;
    for (const method of METHODS) {
      const handler = mod[method] as ((req: Request) => Promise<Response>) & { auth?: string };
      if (!handler) continue;
      expect(handler.auth, `${method} ${path} must use route()`).toBeDefined();
      if (handler.auth === 'public') {
        expect(PUBLIC_ROUTES.has(path), `${method} ${path} is public but not allow-listed`).toBe(
          true,
        );
      } else {
        const res = await handler(new Request(`http://x${path}`, { method }));
        expect(res.status, `${method} ${path} without a token`).toBe(401);
      }
    }
  });
});
