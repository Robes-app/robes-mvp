-- Migration 24 — looks.styling (the look prompt, phase 2 · 2026-10-01)
-- How each piece on a saved look is worn, by wardrobe piece id:
--   { "<wardrobe_item_id>": "tucked at the front", ... }
-- Written by the look page's Update (the box's `styled` notes) and the
-- composer's Save; read by the look page's rack and by /api/avatar/render
-- (the note rides the manifest, so a tuck renders as a tuck). Until this
-- runs the client strips the column on PGRST204 and the notes live on the
-- draft only. Idempotent. No backfill — null is the normal state.
alter table public.looks add column if not exists styling jsonb;
comment on column public.looks.styling is 'How each piece is worn, by wardrobe_item id (the look prompt, phase 2).';
