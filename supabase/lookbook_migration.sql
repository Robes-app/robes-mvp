-- Lookbook + moodboard persistence — run once in Supabase SQL editor.
-- Saved looks and moodboards previously lived only in per-browser
-- localStorage; this table makes them survive devices, reloads and
-- storage clears. `id` is the client-generated Date.now() key so
-- existing local entries sync up without remapping.

create table if not exists public.lookbook_items (
  id          bigint not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'key-piece',   -- 'key-piece' | 'look' | 'moodboard'
  title       text not null default '',
  subtitle    text not null default '',
  img         text,
  data        jsonb not null default '{}'::jsonb,  -- kpData / moodboard payload
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.lookbook_items enable row level security;

create policy "lookbook_select_own" on public.lookbook_items
  for select using (auth.uid() = user_id);
create policy "lookbook_insert_own" on public.lookbook_items
  for insert with check (auth.uid() = user_id);
create policy "lookbook_update_own" on public.lookbook_items
  for update using (auth.uid() = user_id);
create policy "lookbook_delete_own" on public.lookbook_items
  for delete using (auth.uid() = user_id);

create index if not exists idx_lookbook_user_created
  on public.lookbook_items (user_id, created_at desc);
