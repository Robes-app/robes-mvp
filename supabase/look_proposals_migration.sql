-- Migration 19 — proposals on a Robes-built look (2026-08-13)
--
-- A Look can only HOLD pieces she owns (look_pieces references
-- wardrobe_items), but a Robes build proposes real, shoppable pieces she
-- doesn't own yet. Until now those proposals survived only in the wishlist,
-- so a saved build reopened as an empty rack (Annie's report, 2026-08-13).
-- They now ride the look row itself as a jsonb snapshot — the same shape
-- the composer's shop rows use: [{role, chip, cats, opts, oi, saved,
-- image_url}] — so a saved build reopens exactly as it was built.
--
-- Until this runs, the client strips the column on PGRST204 and retries
-- (_lkPropCol in dashboard-personalize.js); proposals then persist in the
-- localStorage cache only. Idempotent; safe to re-run.

alter table public.looks add column if not exists proposals jsonb;
