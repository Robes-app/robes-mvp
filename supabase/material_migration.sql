-- Migration 29 — the material (2026-10-24, design "Colour & material, one section").
--
-- A piece records ONE material — the one it is mostly made of — as an id
-- from material_model.cjs (40 materials in seven families), or null when
-- nobody can tell. The family is derived from the id, never stored. The
-- ids are validated by the server and the client resolver against the
-- model (no FK and no check: the list is code, like the colour model).
-- A low-confidence read rides item_dna.material_check until she answers.
-- Idempotent; rollback at the foot.
--
-- Run once in the Supabase SQL editor. Until it runs the client strips
-- `material` on PGRST204 (_waMatCols / _wlMatCols) and files as before.

alter table public.wardrobe_items add column if not exists material text;
alter table public.wishlist_items add column if not exists material text;

create index if not exists idx_wardrobe_items_material on public.wardrobe_items (user_id, material) where material is not null;

-- Rollback:
-- drop index if exists public.idx_wardrobe_items_material;
-- alter table public.wardrobe_items drop column if exists material;
-- alter table public.wishlist_items drop column if exists material;
