import { describe, expect, it } from 'vitest';
import { inTx } from '../pg';

describe('schema meta (ADR-019/020)', () => {
  it('keeps app tables out of public', () =>
    inTx(async (q) => {
      const rows = await q<{ tablename: string }>(
        "select tablename from pg_tables where schemaname = 'public' and tablename <> 'schema_migrations'",
      );
      expect(rows).toEqual([]);
    }));

  it('grants PUBLIC nothing on app tables or app/private functions', () =>
    inTx(async (q) => {
      const tables = await q(
        "select table_name from information_schema.role_table_grants where grantee = 'PUBLIC' and table_schema in ('app', 'private')",
      );
      expect(tables).toEqual([]);
      const fns = await q<{ proname: string }>(
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname in ('app', 'private')
           and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                       where a.grantee = 0 and a.privilege_type = 'EXECUTE')`,
      );
      expect(fns).toEqual([]);
    }));

  it('lets robes_app CRUD every app table', () =>
    inTx(async (q) => {
      const missing = await q(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'app' and c.relkind in ('r', 'p')
           and not (has_table_privilege('robes_app', c.oid, 'select')
             and has_table_privilege('robes_app', c.oid, 'insert')
             and has_table_privilege('robes_app', c.oid, 'update')
             and has_table_privilege('robes_app', c.oid, 'delete'))`,
      );
      expect(missing).toEqual([]);
    }));

  it('maintains updated_at by trigger on every table that has it', () =>
    inTx(async (q) => {
      const missing = await q(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'app' and c.relkind = 'r'
           and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped)
           and not exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'touch_updated_at')`,
      );
      expect(missing).toEqual([]);
    }));
});

describe('feature flags', () => {
  it('seeds every flag in @robes/core with its launch default', () =>
    inTx(async (q) => {
      const { FEATURE_FLAGS, ADDED_FEATURE_FLAGS } = await import('@robes/core/flags');
      const rows = await q<{ key: string; enabled: boolean }>(
        'select key, enabled from app.feature_flags',
      );
      const seeded = Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
      for (const [key, flag] of Object.entries({ ...FEATURE_FLAGS, ...ADDED_FEATURE_FLAGS })) {
        expect(seeded[key], key).toBe(flag.enabled);
      }
      // Trips stay hidden until they relaunch (legacy beta 2eacfb4).
      expect(seeded.trips).toBe(false);
    }));
});
