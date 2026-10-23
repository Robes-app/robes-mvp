import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { withClient } from './db';

// The legacy app's SQL (repo root supabase/, read-only), in the order reference/legacy-data-model.md
// §1 records. Read-only reports (audit/verify) and data backfills are left out.
export const LEGACY_SQL_ORDER = [
  'schema.sql',
  'wardrobe_schema.sql',
  'item_dna_migration.sql',
  'style_notes_migration.sql',
  'style_notes_analysis_migration.sql',
  'style_dna_migration.sql',
  'onboarding_migration.sql',
  'lookbook_migration.sql',
  'share_migration.sql',
  'wardrobe_v2_migration.sql',
  'admin_capture_migration.sql',
  'planned_days_migration.sql',
  'gender_identity_migration.sql',
  'looks_migration.sql',
  'wardrobe_taxonomy_migration.sql',
  'look_roles_migration.sql',
  'weekly_plan_sweep.sql',
  'season_tags_migration.sql',
  'tag_prefill_migration.sql',
  'look_proposals_migration.sql',
  'avatar_migration.sql',
  'avatar_render_migration.sql',
  'notifications_migration.sql',
  'wardrobe_inbox_migration.sql',
  'look_styling_migration.sql',
  'look_states_migration.sql',
  'colour_model_migration.sql',
] as const;

const LEGACY_DIR = fileURLToPath(new URL('../../../../supabase/', import.meta.url));

// The legacy app's schema sits beside platform/ only on branches that carry it (beta, not main).
export function legacySchemaPresent(): boolean {
  return existsSync(`${LEGACY_DIR}schema.sql`);
}

// Just enough of Supabase for the legacy DDL to apply on plain Postgres.
const SUPABASE_STUBS = `
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}',
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
`;

// pgvector isn't in the local image; legacy only created the extension, never a vector column.
function legacySql(file: string): string {
  return readFileSync(`${LEGACY_DIR}${file}`, 'utf8').replace(
    /create extension if not exists vector;/gi,
    '-- (fixture) vector extension skipped',
  );
}

export async function buildLegacySchema(url: string): Promise<void> {
  await withClient(url, async (c) => {
    await c.query(SUPABASE_STUBS);
    for (const file of LEGACY_SQL_ORDER) {
      try {
        await c.query(legacySql(file));
      } catch (err) {
        throw new Error(`legacy ${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
}

export type Sql = (text: string, values?: unknown[]) => Promise<pg.QueryResult>;

// Throwaway local legacy database: schema from the legacy SQL, then the deterministic rows.
export async function buildLegacyFixture(url: string, extraSql?: string): Promise<void> {
  const { FIXTURE_SQL } = await import('./fixture-data');
  await buildLegacySchema(url);
  await withClient(url, async (c) => {
    await c.query(FIXTURE_SQL);
    if (extraSql) await c.query(extraSql);
  });
}
