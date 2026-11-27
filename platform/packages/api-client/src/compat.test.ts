import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compareVersions } from '@robes/contracts';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { APP_VERSIONS } from '../../../app/src/server/app-versions';
import { type AppContract, breaksFor, covers, inflate } from './compat';

const json = (s: z.ZodType, io: 'input' | 'output') =>
  z.toJSONSchema(s, { io, unrepresentable: 'any' }) as Record<string, unknown>;
const ctx = { path: 'x', tolerant: false, soft: false };
// Would an app built with `was` read what `now` returns?
const reads = (was: z.ZodType, now: z.ZodType, tolerant = false) =>
  covers(json(was, 'input'), json(now, 'output'), { ...ctx, tolerant });
// Would today's `now` take what an app built with `was` sends?
const takes = (now: z.ZodType, was: z.ZodType) =>
  covers(json(now, 'input'), json(was, 'input'), ctx);

const Kind = z.enum(['top', 'shoe']);
const Wider = z.enum(['top', 'shoe', 'bag']);

describe('covers (ADR-022)', () => {
  it('an app that rejects responses breaks on a new value or a wider range (#259, 0.7.0)', () => {
    expect(reads(z.object({ k: Kind }), z.object({ k: Wider }))).toHaveLength(1);
    expect(
      reads(z.object({ n: z.number().max(5) }), z.object({ n: z.number().max(7) })),
    ).toHaveLength(1);
  });

  it('an app that mends responses reads them, but not a new value it must have', () => {
    const soft = z.object({
      k: Kind.nullable(),
      n: z.number().max(5),
      list: z.array(z.object({ k: Kind })),
    });
    const now = z.object({
      k: Wider.nullable(),
      n: z.number().max(7),
      list: z.array(z.object({ k: Wider })),
    });
    expect(reads(soft, now, true)).toEqual([]);
    expect(reads(z.object({ k: Kind }), z.object({ k: Wider }), true)).toHaveLength(1);
  });

  it('a field it reads that may now be missing breaks it', () => {
    expect(reads(z.object({ a: z.string() }), z.object({ a: z.string().optional() }))).toHaveLength(
      1,
    );
    expect(reads(z.object({ a: z.string().default('') }), z.object({}))).toEqual([]);
  });

  it('the server must keep taking what the app sends', () => {
    expect(takes(z.object({ a: z.string() }), z.object({ a: z.string() }))).toEqual([]);
    expect(
      takes(z.object({ a: z.string(), b: z.string() }), z.object({ a: z.string() })),
    ).toHaveLength(1);
    expect(takes(z.object({ k: Kind }), z.object({ k: Wider }))).toHaveLength(1);
    expect(
      takes(z.object({ s: z.string().max(5) }), z.object({ s: z.string().max(9) })),
    ).toHaveLength(1);
    expect(takes(z.object({ s: z.string().optional() }), z.object({ s: z.string() }))).toEqual([]);
  });

  it('a route the app calls must still be there', () => {
    const app: AppContract = {
      version: '1.0.0',
      tolerant: true,
      routes: { 'GET /gone': { key: 'gone', auth: 'user' } },
    };
    expect(breaksFor(app)).toEqual(['GET /gone (gone): gone']);
  });
});

// Every saved app version still supported (at or above the minimum app version) must be served by
// the API in this tree. A failure here is a two-step change: platform/CLAUDE.md rules 1–3.
const dir = new URL('../contracts/', import.meta.url).pathname;
const saved = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe.each(saved)('contracts/%s', (file) => {
  const app = inflate(JSON.parse(readFileSync(join(dir, file), 'utf8')) as AppContract);
  const supported = compareVersions(app.version, APP_VERSIONS.minimum) >= 0;
  it.skipIf(!supported)(`is still served (${app.tolerant ? 'mends' : 'rejects'} responses)`, () => {
    expect(breaksFor(app)).toEqual([]);
  });
});
