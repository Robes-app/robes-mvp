-- migrate:up
-- SEC-82 retention; maintenanceFn runs private.run_maintenance() on an EventBridge schedule.

-- Hard-deletes tombstones older than 30 days in every app table with deleted_at.
create function private.purge_soft_deleted()
returns void
language plpgsql
set search_path = ''
as $$
declare
  t record;
begin
  for t in
    select c.oid::regclass as rel
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'deleted_at' and not a.attisdropped
    where n.nspname = 'app' and c.relkind = 'r'
  loop
    execute pg_catalog.format(
      'delete from %s where deleted_at < now() - interval ''30 days''', t.rel);
  end loop;
end;
$$;

create function private.purge_generation_payloads()
returns void
language sql
set search_path = ''
as $$
  update app.generation_calls
  set prompt = null, response = null
  where created_at < now() - interval '30 days' and (prompt is not null or response is not null);
  delete from app.generation_calls where created_at < now() - interval '13 months';
  delete from app.events where created_at < now() - interval '13 months';
  delete from app.generation_cache where expires_at < now();
$$;

create function private.purge_inbox_bodies()
returns void
language sql
set search_path = ''
as $$
  update app.wardrobe_inbox
  set from_email = null, subject = null
  where decided_at < now() - interval '90 days' and (from_email is not null or subject is not null);
$$;

create function private.expire_ideas()
returns void
language sql
set search_path = ''
as $$
  update app.artifacts
  set deleted_at = now()
  where type = 'idea' and saved_at is null and expires_at < now() and deleted_at is null;
$$;

revoke execute on function private.purge_soft_deleted() from public;
revoke execute on function private.purge_generation_payloads() from public;
revoke execute on function private.purge_inbox_bodies() from public;
revoke execute on function private.expire_ideas() from public;

create function private.run_maintenance()
returns void
language sql
security definer
set search_path = ''
as $$
  select private.purge_soft_deleted();
  select private.purge_generation_payloads();
  select private.purge_inbox_bodies();
  select private.expire_ideas();
$$;
revoke execute on function private.run_maintenance() from public;
grant execute on function private.run_maintenance() to robes_app;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
