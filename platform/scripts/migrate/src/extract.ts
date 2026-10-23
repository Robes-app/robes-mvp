import type pg from 'pg';
import { LEGACY_CATALOG } from './catalog';
import { withClient } from './db';

const BATCH = 1000;

export interface ExtractReport {
  tables: Record<string, { rows: number; missingColumns: string[]; missingTable: boolean }>;
}

// `auth.users` lands as legacy.auth_users; public tables keep their names.
export function legacyTableName(source: string): string {
  return source === 'auth.users' ? 'auth_users' : source.replace(/^public\./, '');
}

const ident = (s: string) => `"${s.replaceAll('"', '""')}"`;

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
export async function extract(sourceUrl: string, targetUrl: string): Promise<ExtractReport> {
  const report: ExtractReport = { tables: {} };
  await withClient(sourceUrl, (src) =>
    withClient(targetUrl, async (dst) => {
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
          await src.query(
            `declare legacy_rows cursor for select ${list} from ${ident(schema)}.${ident(name)}`,
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
    }),
  );
  return report;
}
