// Saves what this app version calls and accepts to contracts/<version>.json (ADR-022). Run when a
// build is cut, from the tree it is built from (ios-release.md §3):
//   pnpm --filter @robes/api-client contract:save            # the version in mobile/app.json
//   pnpm --filter @robes/api-client contract:save 0.8.0 --strict   # a build that rejects, not mends
// `src/compat.test.ts` then fails any change that would break a saved version still supported.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@robes/contracts';
import { contractFor } from '../src/compat';

const here = new URL('..', import.meta.url).pathname;
const platform = join(here, '..', '..');
const args = process.argv.slice(2);
const version =
  args.find((a) => !a.startsWith('--')) ??
  (
    JSON.parse(readFileSync(join(platform, 'mobile/app.json'), 'utf8')) as {
      expo: { version: string };
    }
  ).expo.version;

// The route keys the app's source names: its screens, and the client hooks it uses.
function usedKeys(): Set<string> {
  const keys = new Set(Object.keys(routes));
  const used = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
        for (const m of readFileSync(path, 'utf8').matchAll(
          /['"`]([a-zA-Z]+(?:\.[a-zA-Z]+)+)['"`]/g,
        )) {
          if (m[1] && keys.has(m[1])) used.add(m[1]);
        }
      }
    }
  };
  walk(join(platform, 'mobile/src'));
  walk(join(here, 'src'));
  return used;
}

// Shared sub-schemas once each (a taxonomy enum appears in dozens of routes): 2.6 MB → ~200 KB.
// The route list stays readable: which routes this version calls, and with which auth.
const schemas: Record<string, unknown> = {};
function share(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(share);
  if (typeof v !== 'object' || v === null) return v;
  const kept = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, share(x)]));
  const text = JSON.stringify(kept);
  if (text.length <= 120) return kept;
  const id = createHash('sha1').update(text).digest('hex').slice(0, 12);
  schemas[id] = kept;
  return { $h: id };
}

const { routes: used, ...meta } = contractFor(version, usedKeys());
const shared = Object.fromEntries(
  Object.entries(used).map(([id, { key, auth, params, input, output, events }]) => [
    id,
    {
      key,
      auth,
      ...(params ? { params: share(params) } : {}),
      ...(input ? { input: share(input) } : {}),
      ...(output ? { output: share(output) } : {}),
      ...(events ? { events: share(events) } : {}),
    },
  ]),
);
const contract = { ...meta, tolerant: !args.includes('--strict'), routes: shared, schemas };
const file = join(here, 'contracts', `${version}.json`);
writeFileSync(file, `${JSON.stringify(contract, null, 1)}\n`);
console.log(`${file}: ${Object.keys(used).length} routes`);
