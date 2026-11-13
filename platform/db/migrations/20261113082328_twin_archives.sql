-- migrate:up
-- What deleting her digital twin cleared, held for 30 days so a delete made by mistake can be put
-- back at her ask (owner, 13 Nov 2026). The photographs wait the same 30 days as deleted assets
-- (stale-uploads). One row per delete; the maintenance sweep removes it when its 30 days are up,
-- and it goes with her account (cascade). Additive: the code deployed before this never reads it.
create table app.twin_archives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  -- The avatars row, the style-profile and profile columns the delete cleared, the looks' pictures
  -- drawn on her twin and the assets it marked deleted, as they stood (repo model.deleteTwin).
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  restored_at timestamptz,
  created_at timestamptz not null default now()
);
create index twin_archives_user_idx on app.twin_archives (user_id, created_at desc);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
