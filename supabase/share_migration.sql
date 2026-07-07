-- Public share pages for moodboards + lookbook — run once in Supabase SQL editor.
-- A saved look/board becomes shareable when the owner explicitly flips
-- is_public and mints a share_id; the public endpoint can ONLY read rows
-- where is_public = true (anon-scoped RLS policy below).

alter table public.lookbook_items
  add column if not exists share_id text,
  add column if not exists is_public boolean not null default false;

create unique index if not exists idx_lookbook_share_id
  on public.lookbook_items (share_id)
  where share_id is not null;

-- Anonymous (publishable-key) reads are limited to explicitly shared rows.
-- Owner policies from lookbook_migration.sql are untouched.
drop policy if exists "lookbook_select_shared" on public.lookbook_items;
create policy "lookbook_select_shared" on public.lookbook_items
  for select to anon using (is_public = true);

-- Instagram handle captured in the share flow, owner-writable via existing
-- profiles RLS.
alter table public.profiles
  add column if not exists instagram_handle text;
