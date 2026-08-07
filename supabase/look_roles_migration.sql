-- Migration 16 — formula-role cast on a look's pieces (Look Template spec A3,
-- drag & drop amendment 2026-08-07). Run once in the Supabase SQL editor.
--
-- The four dressing-formula roles (The Canvas / The Anchor / The Texture /
-- The Exclamation Point) are display-level casting. On saved Looks the cast
-- rides the piece row: null = Robes' heuristic decides at render (the normal
-- state for every pre-migration row — no backfill), a value = the user's own
-- cast, made by dragging the rack row under a strip. Free text deliberately —
-- the client validates against its canonical set; the column stays honest to
-- whatever the client wrote.
--
-- Until this runs, the client strips the column on PGRST204 and retries
-- (_lkRoleCol in dashboard-personalize.js) — her cast then lives in the
-- localStorage cache only.

alter table public.look_pieces add column if not exists role text;
