-- Migration 25 — look states (2026-10-06, docs/look-states-brief.md,
-- design Look_States_Native).
-- ONE entity, three states: a look is `suggested` (Robes made it, she has
-- not touched it), `draft` (she started editing it, or started one of her
-- own, and has not saved) or `saved` (the Lookbook). Who made the last
-- move sets the state. Only a saved look gathers wears, tags, pins, trips.
-- A key piece is a GROUPING, not a state: the piece a suggestion was built
-- around (anchor_piece_id) and the generation it came from (set_id — the
-- lookbook_items key-piece entry's id, as text; set_index — its slot in
-- that generation, 0..2).
-- Idempotent. Every existing row is `saved` (the default). No backfill of
-- suggestions here — the client derives them from key-piece entries once,
-- on its first load after this runs.
alter table public.looks
  add column if not exists status text not null default 'saved',
  add column if not exists anchor_piece_id uuid references public.wardrobe_items(id) on delete set null,
  add column if not exists set_id text,
  add column if not exists set_index smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'looks_status_check'
  ) then
    alter table public.looks
      add constraint looks_status_check check (status in ('suggested', 'draft', 'saved'));
  end if;
end $$;

create index if not exists looks_status_idx on public.looks (user_id, status);
create index if not exists looks_anchor_idx on public.looks (anchor_piece_id) where anchor_piece_id is not null;
create index if not exists looks_set_idx on public.looks (set_id) where set_id is not null;

-- Rollback (independently revertible — nothing reads these columns before
-- the client that ships with them):
-- drop index if exists public.looks_set_idx;
-- drop index if exists public.looks_anchor_idx;
-- drop index if exists public.looks_status_idx;
-- alter table public.looks drop constraint if exists looks_status_check;
-- alter table public.looks drop column if exists set_index, drop column if exists set_id,
--   drop column if exists anchor_piece_id, drop column if exists status;
