begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- ADR-019: client roles never reach app data; the API is the only path.
select is(
  (select count(*)::int from pg_tables where schemaname = 'public'),
  0, 'no tables in public (PostgREST-exposed); app tables live in schema app');

select ok(
  not has_schema_privilege('anon', 'app', 'usage')
    and not has_schema_privilege('authenticated', 'app', 'usage'),
  'anon/authenticated cannot use schema app');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated', 'PUBLIC') and table_schema in ('app', 'private', 'public')),
  0, 'anon/authenticated/PUBLIC hold no table privileges');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('app', 'private', 'public')
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'anon/authenticated can execute no app/private/public functions');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app' and c.relkind = 'r'
      and not (has_table_privilege('robes_app', c.oid, 'select')
        and has_table_privilege('robes_app', c.oid, 'insert')
        and has_table_privilege('robes_app', c.oid, 'update')
        and has_table_privilege('robes_app', c.oid, 'delete'))),
  0, 'robes_app has CRUD on every app table');

select ok(
  not has_table_privilege('robes_app', 'auth.users', 'select'),
  'robes_app cannot read auth.users');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app' and c.relkind = 'r'
      and exists (select 1 from pg_attribute a
        where a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped)
      and not exists (select 1 from pg_trigger g
        where g.tgrelid = c.oid and g.tgname = 'touch_updated_at')),
  0, 'every table with updated_at maintains it by trigger');

select * from finish();
rollback;
