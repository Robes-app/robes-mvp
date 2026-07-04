-- ============================================================
-- Style DNA migration (PRD: Style DNA Core Profile Generation)
-- Run once in the Supabase SQL editor.
--
-- Deviation from the PRD schema: profiles already exists with text
-- columns (season/undertone/contrast/body_type) under RLS, so we do
-- not convert them to Postgres enums — value sets are enforced by the
-- deterministic engine in style_dna.js instead.
-- ============================================================

-- Native vector extension for downstream semantic item matching
create extension if not exists vector;

-- The Style DNA document (PRD §3.3 payload shape)
alter table public.profiles add column if not exists style_dna jsonb default '{}'::jsonb not null;

create index if not exists idx_profiles_style_dna
  on public.profiles using gin (style_dna);

-- Cached wardrobe counter for cold-start prompt routing (PRD §6)
alter table public.profiles add column if not exists wardrobe_items_count int default 0 not null;

create or replace function public.sync_wardrobe_items_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set wardrobe_items_count = wardrobe_items_count + 1 where id = new.user_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.profiles set wardrobe_items_count = greatest(wardrobe_items_count - 1, 0) where id = old.user_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists wardrobe_items_count_sync on public.wardrobe_items;
create trigger wardrobe_items_count_sync
  after insert or delete on public.wardrobe_items
  for each row execute procedure public.sync_wardrobe_items_count();

-- Backfill existing rows
update public.profiles p
set wardrobe_items_count = coalesce(w.n, 0)
from (select user_id, count(*) as n from public.wardrobe_items group by user_id) w
where p.id = w.user_id;
