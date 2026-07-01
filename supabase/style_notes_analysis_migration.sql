-- ============================================================
-- Style Notes analysis columns — run once in Supabase SQL editor.
-- Stores the full Gemini analysis JSON per photo (colour harmony
-- from the headshot, silhouette from the full-length shot).
-- ============================================================

alter table public.profiles add column if not exists colour_analysis     jsonb;
alter table public.profiles add column if not exists silhouette_analysis jsonb;
