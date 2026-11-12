import type pg from 'pg';
import { LEGACY_CATALOG } from './catalog';
import { withClient } from './db';

const BATCH = 1000;

export interface ExtractOptions {
  // Copy only the people with these legacy emails (and what they own); everyone when absent.
  only?: readonly string[];
}

export interface ExtractReport {
  tables: Record<string, { rows: number; missingColumns: string[]; missingTable: boolean }>;
  // People whose email already has a platform account under another id: her legacy rows were
  // re-keyed to that account, so transform adds to it.
  merged: number;
}

// `auth.users` lands as legacy.auth_users; public tables keep their names.
export function legacyTableName(source: string): string {
  return source === 'auth.users' ? 'auth_users' : source.replace(/^public\./, '');
}

const ident = (s: string) => `"${s.replaceAll('"', '""')}"`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The named people's legacy ids, as a uuid[] literal. An address legacy does not know stops the
// run before anything is copied: a typo must never quietly leave someone behind.
async function namedPeople(src: pg.Client, emails: readonly string[]): Promise<string> {
  const asked = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (asked.length === 0) throw new Error('--only needs at least one email');
  const { rows } = await src.query<{ id: string; email: string }>(
    'select id::text as id, lower(trim(email)) as email from auth.users where lower(trim(email)) = any($1)',
    [asked],
  );
  const found = new Set(rows.map((r) => r.email));
  const unknown = asked.filter((e) => !found.has(e));
  if (unknown.length > 0) throw new Error(`no legacy account for: ${unknown.join(', ')}`);
  const ids = rows.map((r) => r.id);
  if (!ids.every((id) => UUID.test(id))) throw new Error('a legacy user id is not a uuid');
  return `'{${ids.join(',')}}'::uuid[]`;
}

// How each legacy table is tied to a person, for a copy of named people. A table with no tie must
// be listed as shared here, so a new one is never copied whole by accident.
const SHARED = new Set(['public.avatar_cells']);
function ownedBy(table: string, columns: ReadonlySet<string>, ids: string): string | null {
  if (SHARED.has(table)) return null;
  if (table === 'auth.users' || table === 'public.profiles') return `id = any(${ids})`;
  if (columns.has('user_id')) return `user_id = any(${ids})`;
  if (columns.has('look_id'))
    return `look_id in (select id from public.looks where user_id = any(${ids}))`;
  if (columns.has('wardrobe_item_id'))
    return `wardrobe_item_id in (select id from public.wardrobe_items where user_id = any(${ids}))`;
  throw new Error(`${table}: no way to tell whose rows these are; add it to ownedBy`);
}

// She signed in on the platform before her beta data came, so her email has an account under
// another id. Her rows in the copy are re-keyed to it: transform then adds to the account she has
// (it would otherwise skip her). Of two legacy accounts with one email, only the earlier moves.
async function rekeyToPlatformAccounts(dst: pg.Client): Promise<number> {
  await dst.query('begin');
  try {
    await dst.query(
      `create temp table migrate_rekey on commit drop as
       select distinct on (u.id) a.id as legacy_id, u.id as platform_id
       from legacy.auth_users a join app.users u on u.email = lower(trim(a.email))
       where u.id <> a.id
         -- An account that itself came from legacy is not a place to fold a second legacy
         -- account into: two accounts with one email stay a human's call (migration.md §3).
         and not exists (select 1 from legacy.auth_users o where o.id = u.id)
       order by u.id, a.created_at nulls last, a.id`,
    );
    const { rows } = await dst.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name from information_schema.columns
       where table_schema = 'legacy'
         and (column_name = 'user_id' or (column_name = 'id' and table_name in ('auth_users', 'profiles')))`,
    );
    for (const { table_name, column_name } of rows) {
      await dst.query(
        `update legacy.${ident(table_name)} t set ${ident(column_name)} = r.platform_id
         from migrate_rekey r where t.${ident(column_name)} = r.legacy_id`,
      );
    }
    const n = await dst.query<{ n: number }>('select count(*)::int as n from migrate_rekey');
    await dst.query('commit');
    return n.rows[0]?.n ?? 0;
  } catch (err) {
    await dst.query('rollback');
    throw err;
  }
}

async function sourceColumns(src: pg.Client, table: string): Promise<Set<string> | null> {
  const [schema, name] = table.split('.');
  const res = await src.query<{ column_name: string }>(
    'select column_name from information_schema.columns where table_schema = $1 and table_name = $2',
    [schema, name],
  );
  return res.rows.length ? new Set(res.rows.map((r) => r.column_name)) : null;
}

// Copies legacy data into the target's `legacy` schema (docs/migration.md §3 step 2). Reads the
// source with SELECT only, and only the catalogued columns (never auth password hashes). The
// `legacy` schema is rebuilt every run, always with the full catalogued shape, so transform can
// rely on every column existing even where a legacy migration never ran (nulls instead).
export async function extract(
  sourceUrl: string,
  targetUrl: string,
  options: ExtractOptions = {},
): Promise<ExtractReport> {
  const report: ExtractReport = { tables: {}, merged: 0 };
  await withClient(sourceUrl, (src) =>
    withClient(targetUrl, async (dst) => {
      const people = options.only ? await namedPeople(src, options.only) : null;
      // On the cutover run the target is the live Supabase project: keep the copy away from its API roles.
      await dst.query(
        'drop schema if exists legacy cascade; create schema legacy; revoke all on schema legacy from public;',
      );
      for (const [table, columns] of Object.entries(LEGACY_CATALOG)) {
        const target = `legacy.${ident(legacyTableName(table))}`;
        await dst.query(
          `create table ${target} (${columns.map(([c, t]) => `${ident(c)} ${t}`).join(', ')})`,
        );
        const present = await sourceColumns(src, table);
        const copied = columns.map(([c]) => c).filter((c) => present?.has(c));
        report.tables[table] = {
          rows: 0,
          missingColumns: columns.map(([c]) => c).filter((c) => !present?.has(c)),
          missingTable: present === null,
        };
        if (!present || copied.length === 0) continue;
        const list = copied.map(ident).join(', ');
        const [schema, name] = table.split('.') as [string, string];
        // One consistent snapshot per table, read through a cursor (no offset paging gaps).
        await src.query('begin transaction isolation level repeatable read read only');
        try {
          const whose = people ? ownedBy(table, present, people) : null;
          await src.query(
            `declare legacy_rows cursor for select ${list} from ${ident(schema)}.${ident(name)}${
              whose ? ` where ${whose}` : ''
            }`,
          );
          for (;;) {
            const { rows } = await src.query(`fetch ${BATCH} from legacy_rows`);
            if (rows.length === 0) break;
            await dst.query(
              `insert into ${target} (${list}) select ${list}
               from json_populate_recordset(null::${target}, $1::json)`,
              [JSON.stringify(rows)],
            );
            const entry = report.tables[table];
            if (entry) entry.rows += rows.length;
          }
        } finally {
          await src.query('rollback');
        }
      }
      report.merged = await rekeyToPlatformAccounts(dst);
    }),
  );
  return report;
}
