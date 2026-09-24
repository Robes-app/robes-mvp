import { type RawBuilder, sql } from 'kysely';

// Keyset paging by (created_at desc, id desc) with an opaque `${createdAt ISO}|${id}` cursor.
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');
}

function decodeCursor(cursor: string | undefined): { at: string; id: string } | null {
  if (!cursor) return null;
  const [at, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  return at && id ? { at, id } : null;
}

// Postgres keeps microseconds but the cursor round-trips through a JS Date (milliseconds),
// so order and compare at millisecond precision or same-millisecond rows skip or repeat.
export const createdMs = sql<Date>`date_trunc('milliseconds', created_at)`;

export function afterCursor(cursor: string | undefined): RawBuilder<boolean> | null {
  const c = decodeCursor(cursor);
  return c
    ? sql<boolean>`(date_trunc('milliseconds', created_at), id) < (${c.at}::timestamptz, ${c.id}::uuid)`
    : null;
}

// Rows fetched with limit + 1 → one page and the cursor for the next.
export function toPage<T extends { createdAt: Date; id: string }>(
  rows: T[],
  limit: number,
): Page<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encodeCursor(last) : null };
}
