import { type RawBuilder, sql } from 'kysely';

// How the admin users table sorts, over the derived table `u` that `listUsers` builds.
// `expr` orders and pages; `cursorText` is the same value as text for the cursor, read back
// with `::type`. Words start A→Z, numbers and dates largest first (as beta's admin did).
// The default direction mirrors `adminUserSortDefaultDir` in @robes/contracts.
export type UserSort = 'email' | 'name' | 'joined' | 'pieces' | 'looks' | 'jobs' | 'lastActive';
type SortType = 'text' | 'bigint' | 'timestamptz';

interface SortKey {
  expr: RawBuilder<unknown>;
  cursorText: RawBuilder<unknown>;
  type: SortType;
  dir: 'asc' | 'desc';
}

const words = (column: string): SortKey => {
  const expr = sql`lower(${sql.ref(`u.${column}`)}::text)`;
  return { expr, cursorText: expr, type: 'text', dir: 'asc' };
};
const count = (column: string): SortKey => {
  const expr = sql`${sql.ref(`u.${column}`)}::bigint`;
  return { expr, cursorText: sql`${expr}::text`, type: 'bigint', dir: 'desc' };
};
// Milliseconds, because the cursor round-trips through ISO text; never-active sorts as oldest.
const time = (column: string): SortKey => {
  const expr = sql`coalesce(date_trunc('milliseconds', ${sql.ref(`u.${column}`)}), '-infinity')`;
  return { expr, cursorText: sql`to_json(${expr}) #>> '{}'`, type: 'timestamptz', dir: 'desc' };
};

export const USER_SORTS: Record<UserSort, SortKey> = {
  email: words('email'),
  name: words('name'),
  joined: time('created_at'),
  pieces: count('pieces'),
  looks: count('looks'),
  jobs: count('jobs'),
  lastActive: time('last_active_at'),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const valid: Record<SortType, (v: string) => boolean> = {
  text: () => true,
  bigint: (v) => /^\d{1,18}$/.test(v),
  timestamptz: (v) => v === '-infinity' || !Number.isNaN(Date.parse(v)),
};

export function encodeUserCursor(sort: UserSort, value: string, id: string): string {
  return Buffer.from(JSON.stringify([sort, value, id])).toString('base64url');
}

// A cursor from another sort, or one that doesn't parse, starts from the top rather than failing.
export function decodeUserCursor(
  cursor: string | undefined,
  sort: UserSort,
): { value: string; id: string } | null {
  if (!cursor) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString());
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== 3) return null;
  const [s, value, id] = parsed;
  if (s !== sort || typeof value !== 'string' || typeof id !== 'string') return null;
  if (!UUID.test(id) || !valid[USER_SORTS[sort].type](value)) return null;
  return { value, id };
}
