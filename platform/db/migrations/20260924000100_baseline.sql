-- migrate:up
-- ADR-019/020: the API and workers are the only path to app data. App tables live in schema
-- `app`; only the robes_app role can use it. Ownership is enforced in code (packages/db).

create schema if not exists extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
revoke all on schema app from public;

create schema if not exists private;
revoke all on schema private from public;

-- The API/worker login role. Its password is set per environment out of band
-- (runbooks/environments.md); locally by db/docker-init.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'robes_app') then
    create role robes_app nologin noinherit;
  end if;
end;
$$;
-- postgres (the migration/admin role) may act as robes_app, e.g. in pgTAP tests.
grant robes_app to postgres;
grant usage on schema app, private, extensions to robes_app;
alter default privileges in schema app grant select, insert, update, delete on tables to robes_app;
alter default privileges in schema app grant usage, select on sequences to robes_app;
alter role robes_app set search_path = app, extensions;

revoke create on schema public from public;
-- EXECUTE-to-PUBLIC is a global default (can't be revoked per schema); every function grant is explicit.
alter default privileges revoke execute on functions from public;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function private.touch_updated_at() from public;

-- Adds the updated_at trigger; every mutable table calls this so none is forgotten.
create function private.track_updates(p_table regclass)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute pg_catalog.format(
    'create trigger touch_updated_at before update on %s for each row execute function private.touch_updated_at()',
    p_table);
end;
$$;
revoke execute on function private.track_updates(regclass) from public;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
