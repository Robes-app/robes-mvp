-- Migration 21 — the avatar render pipeline (2026-08-25)
-- Run once in the Supabase SQL editor. Requires migration 14 (looks) and
-- pairs with migration 20 (profiles.avatar_id / avatar_prefs).
--
-- avatar_cells — the avatar catalog's generated reference images, one row
-- per resolved cell id (e.g. 'w-s3-h1-hg'). Written by the SERVER with the
-- service key (lazy fill: a cell generates the first time a render needs
-- it); clients only ever read. Until this table exists the server keeps
-- cells in an in-process cache — renders still work, a cell just
-- regenerates after a restart (~10¢, cosmetic).
--
-- looks.render_url / render_key — the look photographed on her model.
-- render_key = avatar_id + '|' + the sorted piece ids, so an unchanged
-- composition never re-renders. Until these columns exist the client
-- strips them on PGRST204 and the render lives in the local cache only.

create table if not exists public.avatar_cells (
  id text primary key,
  image_url text not null,
  descriptor text,
  status text not null default 'ready',
  created_at timestamptz not null default now()
);

alter table public.avatar_cells enable row level security;

drop policy if exists avatar_cells_read on public.avatar_cells;
create policy avatar_cells_read on public.avatar_cells
  for select to authenticated using (true);
-- no insert/update/delete policies: writes go through the service key only

alter table public.looks
  add column if not exists render_url text,
  add column if not exists render_key text;

comment on column public.looks.render_url is
  'The look rendered on her model (Cloudinary URL) — display: render_url -> photo_url -> mosaic.';
comment on column public.looks.render_key is
  'Cache key for render_url: avatar_id | sorted piece ids. Same key = never re-render.';
