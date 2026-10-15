import { globSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RouteHandler } from '@robes/api';
import { API_BASE_PATH, type RouteDef, routes } from '@robes/contracts';
import { describe, expect, it } from 'vitest';

// The @robes/contracts route map drives @robes/api-client, so it must match the handlers exactly.
const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const here = dirname(fileURLToPath(import.meta.url));
const files = globSync('api/v1/**/route.ts', { cwd: here });

// `api/v1/jobs/[id]/cancel/route.ts` → `/jobs/:id/cancel`
function templateFor(file: string): string {
  const segments = dirname(file)
    .split('/')
    .slice(2)
    .filter((s) => !/^\(.*\)$/.test(s))
    .map((s) => s.replace(/^\[(.+)\]$/, ':$1'));
  return `/${segments.join('/')}`;
}

async function handlersByKey(): Promise<Map<string, RouteHandler>> {
  const found = new Map<string, RouteHandler>();
  for (const file of files) {
    const mod = (await import(`./${file}`)) as Record<string, RouteHandler | undefined>;
    for (const method of METHODS) {
      const handler = mod[method];
      if (handler) found.set(`${method} ${templateFor(file)}`, handler);
    }
  }
  return found;
}

const entries = Object.entries(routes) as [string, RouteDef][];

describe('route contract map', async () => {
  const handlers = await handlersByKey();

  it('covers the routes', () => {
    expect(API_BASE_PATH).toBe('/api/v1');
    expect(handlers.size).toBeGreaterThan(0);
  });

  it.each(entries)('%s matches its route.ts', (_key, def) => {
    const handler = handlers.get(`${def.method} ${def.path}`);
    expect(handler, `${def.method} ${def.path} has no route.ts export`).toBeDefined();
    if (!handler) return;
    expect(handler.auth).toBe(def.auth);
    expect(handler.builder).toBe(def.sse ? 'sseRoute' : 'route');
    expect(handler.schemas.params).toBe(def.params);
    if (!def.sse) {
      expect(handler.schemas.input).toBe(def.input);
      expect(handler.schemas.output).toBe(def.output);
    }
  });

  it('has an entry for every route.ts method', () => {
    const mapped = new Set(entries.map(([, def]) => `${def.method} ${def.path}`));
    expect([...handlers.keys()].filter((k) => !mapped.has(k))).toEqual([]);
  });

  it('has unique method + path pairs', () => {
    expect(new Set(entries.map(([, d]) => `${d.method} ${d.path}`)).size).toBe(entries.length);
  });
});
