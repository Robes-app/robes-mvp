import { describe, expect, it } from 'vitest';
import { type RouteDef, routes } from './routes';

const entries = Object.entries(routes) as [string, RouteDef][];

describe('route map', () => {
  it.each(entries)('%s declares a params schema for each :segment', (_key, def) => {
    const names = [...def.path.matchAll(/:([A-Za-z]+)/g)].map((m) => m[1]);
    if (names.length === 0) return expect(def.params).toBeUndefined();
    expect(def.params).toBeDefined();
    const shape = (def.params as unknown as { shape: Record<string, unknown> }).shape;
    expect(Object.keys(shape).sort()).toEqual([...names].sort());
  });

  it('marks idempotency only on POSTs and SSE only on GETs', () => {
    for (const [, def] of entries) {
      if ('idempotent' in def) expect(def.method).toBe('POST');
      if (def.sse) expect(def.method).toBe('GET');
    }
  });

  it('keeps the creating POSTs idempotent', () => {
    expect(routes['jobs.fake'].idempotent).toBe(true);
    expect(routes['uploads.create'].idempotent).toBe(true);
  });
});
