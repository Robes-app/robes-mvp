import type { z } from 'zod';

// ADR-022: an installed app outlives the API it was built against, so a response this build's
// schema rejects is mended rather than thrown away. A number out of range is clamped, a string or
// list too long is cut, and any other bad value is dropped: a nullable field reads null, an
// optional or defaulted one falls back, and a required one takes what holds it with it (a nullable
// or optional object, or its list item). A response with nothing left to drop still fails. `drift`
// is the original error, for reporting.
export type TolerantResult<T> =
  | { success: true; data: T; drift: z.ZodError | null }
  | { success: false; error: z.ZodError };

type Path = readonly PropertyKey[];
type Box = Record<PropertyKey, unknown>;

// Each round mends every issue, deepest and highest index first, so removing a list item never
// shifts a path still to mend; an issue inside an item removed this round waits for the next
// parse (its path would now name the item that slid into place). A rung of the ladder per round.
const MAX_ROUNDS = 50;

export function parseTolerantly<S extends z.ZodType>(
  schema: S,
  body: unknown,
): TolerantResult<z.output<S>> {
  const first = schema.safeParse(body);
  if (first.success) return { success: true, data: first.data, drift: null };
  // A JSON body, so a JSON copy is exact; the caller's value is never changed.
  let value: unknown = body === undefined ? undefined : JSON.parse(JSON.stringify(body));
  let error = first.error;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let changed = false;
    const removed: Path[] = [];
    for (const issue of [...error.issues].sort((a, b) => comparePaths(b.path, a.path))) {
      if (removed.some((r) => startsWith(issue.path, r))) continue;
      const mended = mend(value, issue);
      changed ||= mended.changed;
      value = mended.value;
      if (mended.removed) removed.push(mended.removed);
    }
    if (!changed) break;
    const next = schema.safeParse(value);
    if (next.success) return { success: true, data: next.data, drift: first.error };
    error = next.error;
  }
  return { success: false, error: first.error };
}

// `removed`: the path of a list item it took out, if any.
function mend(
  root: unknown,
  issue: z.core.$ZodIssue,
): { changed: boolean; value: unknown; removed?: Path } {
  const path = issue.path;
  const parent = at(root, path.slice(0, -1));
  const key = path[path.length - 1];
  if (key === undefined || !isBox(parent)) return { changed: false, value: root };
  const current = parent[key];

  if ((issue.code === 'too_big' || issue.code === 'too_small') && issue.inclusive !== false) {
    const bound = Number(issue.code === 'too_big' ? issue.maximum : issue.minimum);
    if (typeof current === 'number' && Number.isFinite(bound)) {
      parent[key] = bound;
      return { changed: true, value: root };
    }
    if (issue.code === 'too_big' && (typeof current === 'string' || Array.isArray(current))) {
      parent[key] = current.slice(0, bound);
      return { changed: true, value: root };
    }
  }
  // A ladder, one rung per round: a list loses the item; a field tries null (nullable), then
  // nothing (optional or defaulted); a required field then climbs to what holds it.
  if (Array.isArray(parent) && current !== undefined) {
    parent.splice(Number(key), 1);
    return { changed: true, value: root, removed: path };
  }
  if (current !== undefined) {
    if (current === null) delete parent[key];
    else parent[key] = null;
    return { changed: true, value: root };
  }
  // Already gone and still required: the ladder climbs to what holds it (null, absent, or the
  // list item), up to the response itself, which is never dropped.
  if (path.length > 1) return mend(root, { ...issue, code: 'custom', path: path.slice(0, -1) });
  return { changed: false, value: root };
}

function comparePaths(a: Path, b: Path): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x) < String(y) ? -1 : 1;
  }
  return a.length - b.length;
}

const startsWith = (path: Path, prefix: Path) => prefix.every((k, i) => path[i] === k);

function isBox(v: unknown): v is Box {
  return typeof v === 'object' && v !== null;
}

function at(root: unknown, path: Path): unknown {
  let v = root;
  for (const k of path) {
    if (!isBox(v)) return undefined;
    v = v[k];
  }
  return v;
}
