begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'every public table has RLS enabled (SEC-14)');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'),
  0, 'anon has no table privileges in public (SEC-12)');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and coalesce(obj_description(c.oid, 'pg_class'), '') not like 'ownership:%'),
  0, 'every public table declares its ownership class');

select * from finish();
rollback;
