import { type JsonRouteDef, type RouteDef, routes, type SseRouteDef } from '@robes/contracts';
import { z } from 'zod';

// ADR-022: what one built app version relies on, saved when the build is cut
// (`contracts/<version>.json`), and whether today's API still serves it.
// Each schema is JSON Schema: `input` is what the app sends, `output` and `events` what it accepts.
type Json = Record<string, unknown>;
export interface RouteContract {
  key: string;
  auth: string;
  params?: Json;
  input?: Json;
  output?: Json;
  events?: Record<string, Json>;
}
export interface AppContract {
  version: string;
  // True from 0.9.0: the build mends responses (tolerant.ts) rather than rejecting them.
  tolerant: boolean;
  // "GET /me" → what that version calls; only routes its source names.
  routes: Record<string, RouteContract>;
  // On disk, a sub-schema used more than once is stored here and written `{ "$h": id }`.
  schemas?: Record<string, unknown>;
}

// A saved contract with its shared sub-schemas put back in place.
export function inflate(saved: AppContract): AppContract {
  const table = saved.schemas ?? {};
  const put = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(put);
    if (!isObj(v)) return v;
    if (typeof v.$h === 'string' && Object.keys(v).length === 1) return put(table[v.$h]);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, put(x)]));
  };
  const { schemas: _, ...rest } = saved;
  return { ...rest, routes: put(saved.routes) as AppContract['routes'] };
}

const schemaOf = (s: z.ZodType, io: 'input' | 'output'): Json =>
  z.toJSONSchema(s, { io, unrepresentable: 'any', reused: 'inline' }) as Json;
const routeId = (def: RouteDef) => `${def.method} ${def.path}`;

// The contract of the code in this tree, for the route keys the app's source names.
export function contractFor(version: string, usedKeys: ReadonlySet<string>): AppContract {
  const out: AppContract = { version, tolerant: true, routes: {} };
  for (const [key, def] of Object.entries(routes) as [string, RouteDef][]) {
    if (!usedKeys.has(key)) continue;
    const sse = 'sse' in def ? (def as SseRouteDef) : null;
    const params = def.params ? { params: schemaOf(def.params, 'input') } : {};
    out.routes[routeId(def)] = sse
      ? {
          key,
          auth: def.auth,
          ...params,
          events: mapValues(sse.events, (s) => schemaOf(s, 'input')),
        }
      : {
          key,
          auth: def.auth,
          ...params,
          input: schemaOf((def as JsonRouteDef).input, 'input'),
          output: schemaOf((def as JsonRouteDef).output, 'input'),
        };
  }
  return out;
}

// Every way today's routes would fail that app version; empty when it is still served.
export function breaksFor(app: AppContract): string[] {
  const now = new Map((Object.values(routes) as RouteDef[]).map((d) => [routeId(d), d]));
  const problems: string[] = [];
  for (const [id, was] of Object.entries(app.routes)) {
    const def = now.get(id);
    if (!def) {
      problems.push(`${id} (${was.key}): gone`);
      continue;
    }
    if ((AUTH_RANK[def.auth] ?? 0) > (AUTH_RANK[was.auth] ?? 0)) {
      problems.push(`${id}: now needs ${def.auth} (was ${was.auth})`);
    }
    const at = (part: string) => ({ path: `${id} ${part}`, tolerant: false, soft: false });
    if (was.params && def.params) {
      problems.push(...covers(schemaOf(def.params, 'input'), was.params, at('params')));
    }
    if ('sse' in def) {
      for (const [name, wasEvent] of Object.entries(was.events ?? {})) {
        const event = (def as SseRouteDef).events[name];
        if (!event) problems.push(`${id} event ${name}: gone`);
        else
          problems.push(
            ...covers(wasEvent, schemaOf(event, 'output'), {
              ...at(`event ${name}`),
              tolerant: app.tolerant,
            }),
          );
      }
      continue;
    }
    // Today's input must take everything that app sends; that app must read what today returns.
    if (was.input) problems.push(...covers(schemaOf(def.input, 'input'), was.input, at('input')));
    if (was.output)
      problems.push(
        ...covers(was.output, schemaOf(def.output, 'output'), {
          ...at('output'),
          tolerant: app.tolerant,
        }),
      );
  }
  return problems;
}

const AUTH_RANK: Record<string, number> = { public: 0, user: 1, admin: 2 };

interface Ctx {
  path: string;
  // Reading a response in a build that mends it (tolerant.ts): inclusive number bounds are clamped
  // and long strings and lists cut anywhere; a new value (a widening) is nulled, dropped or takes
  // its list item with it, so it is safe only where the value is `soft` (nullable, optional, or
  // inside a list). Anything else — a field gone, a type changed — breaks that build everywhere.
  tolerant: boolean;
  soft: boolean;
}

const isAny = (s: Json) =>
  Object.keys(s).every((k) => k === '$schema' || k === 'default' || k === 'description');

function typesOf(s: Json): string[] | null {
  if (Array.isArray(s.type)) return s.type as string[];
  if (typeof s.type === 'string') return [s.type];
  const vals = valuesOf(s);
  if (vals) return [...new Set(vals.map((v) => (v === null ? 'null' : typeof v)))];
  return null;
}

function valuesOf(s: Json): unknown[] | null {
  if ('const' in s) return [s.const];
  if (Array.isArray(s.enum)) return s.enum;
  return null;
}

const typeFits = (t: string, allowed: string[]) =>
  allowed.includes(t) || (t === 'integer' && allowed.includes('number'));

// Does `wide` accept every value `narrow` allows? Returns why not.
export function covers(wide: Json, narrow: Json, ctx: Ctx): string[] {
  if (isAny(wide)) return [];
  const branches = (narrow.anyOf ?? narrow.oneOf) as Json[] | undefined;
  if (branches) return branches.flatMap((b) => covers(wide, b, ctx));
  const nTypes = typesOf(narrow);
  if (nTypes && nTypes.length > 1 && !valuesOf(narrow)) {
    return nTypes.flatMap((t) => covers(wide, { ...narrow, type: t }, ctx));
  }
  const wBranches = (wide.anyOf ?? wide.oneOf) as Json[] | undefined;
  if (wBranches) {
    const tries = wBranches.map((b) => covers(b, narrow, ctx));
    return tries.find((p) => p.length === 0) ?? tries.sort((a, b) => a.length - b.length)[0] ?? [];
  }
  const problems: string[] = [];
  const say = (what: string) => problems.push(`${ctx.path}: ${what}`);
  // A value this build has no word for: mended away where it is soft, a break where it isn't.
  const widened = (what: string) => {
    if (!(ctx.tolerant && ctx.soft)) say(what);
  };
  if (isAny(narrow)) {
    widened('any value was allowed, now restricted');
    return problems;
  }

  const wTypes = typesOf(wide);
  if (wTypes && nTypes) {
    const lost = nTypes.filter((t) => !typeFits(t, wTypes));
    const what = `${lost.join(', ')} no longer accepted (${wTypes.join(', ')})`;
    if (lost.length === 1 && lost[0] === 'null') widened(what);
    else if (lost.length) say(what);
  }
  const wVals = valuesOf(wide);
  if (wVals) {
    const nVals = valuesOf(narrow);
    const extra = nVals?.filter((v) => !wVals.some((w) => JSON.stringify(w) === JSON.stringify(v)));
    if (!nVals) widened(`any value → only ${JSON.stringify(wVals)}`);
    else if (extra?.length) widened(`new values ${JSON.stringify(extra)}`);
  }
  if (typeof wide.pattern === 'string' && wide.pattern !== narrow.pattern) {
    const re = new RegExp(wide.pattern);
    const vals = valuesOf(narrow);
    if (!vals?.every((v) => typeof v === 'string' && re.test(v)))
      widened(`must match ${wide.pattern}`);
  }
  if (typeof wide.format === 'string' && wide.format !== narrow.format) {
    widened(`must be a ${wide.format}`);
  }
  // A mending build clamps inclusive number bounds and cuts long strings and lists, anywhere.
  const mended = new Set(ctx.tolerant ? ['minimum', 'maximum', 'maxLength', 'maxItems'] : []);
  const bounds = [
    'minimum',
    'exclusiveMinimum',
    'maximum',
    'exclusiveMaximum',
    'minLength',
    'maxLength',
    'minItems',
    'maxItems',
  ].filter((b) => !mended.has(b));
  for (const b of bounds) {
    const w = wide[b];
    if (typeof w !== 'number') continue;
    const n = narrow[b];
    const lower = b.startsWith('min') || b === 'exclusiveMinimum';
    if (typeof n !== 'number' || (lower ? n < w : n > w)) {
      widened(`${b} ${n ?? (lower ? '-∞' : '∞')} is past ${w}`);
    }
  }

  // Objects.
  const wProps = (wide.properties ?? {}) as Record<string, Json>;
  const nProps = (narrow.properties ?? {}) as Record<string, Json>;
  const wReq = new Set((wide.required ?? []) as string[]);
  const nReq = new Set((narrow.required ?? []) as string[]);
  for (const key of wReq) {
    if (!nReq.has(key)) say(`${key} may now be missing`);
  }
  for (const [key, n] of Object.entries(nProps)) {
    const w = wProps[key] ?? (isObj(wide.additionalProperties) ? wide.additionalProperties : null);
    if (!w) {
      if (wide.additionalProperties === false) say(`${key} is refused`);
      continue;
    }
    const soft = ctx.soft || !wReq.has(key) || nullable(w);
    problems.push(...covers(w, n, { ...ctx, path: `${ctx.path}.${key}`, soft }));
  }
  if (isObj(narrow.additionalProperties) && isObj(wide.additionalProperties)) {
    problems.push(...covers(wide.additionalProperties, narrow.additionalProperties, ctx));
  }

  // Lists: a mending build drops an item holding a new value it can't read.
  if (isObj(wide.items)) {
    if (!isObj(narrow.items)) say('items unchecked before, now checked');
    else
      problems.push(
        ...covers(wide.items, narrow.items, { ...ctx, path: `${ctx.path}[]`, soft: true }),
      );
  }
  return problems;
}

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const nullable = (s: Json) =>
  typesOf(s)?.includes('null') ||
  ((s.anyOf ?? s.oneOf) as Json[] | undefined)?.some((b) => typesOf(b)?.includes('null')) === true;

function mapValues<T, U>(o: Record<string, T>, f: (v: T) => U): Record<string, U> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
}
