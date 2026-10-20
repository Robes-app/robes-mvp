-- Migration 26 — the digital twin (2026-10-20, docs/digital-twin-model-brief.md).
-- Her model is ONE reference image per account now: generated from her
-- close-up (profiles.headshot_url) plus a text descriptor of her body derived
-- from style_dna.facts and the three sliders in avatar_prefs.adj. The image
-- lives on her own row under own-row RLS — never in the shared avatar_cells
-- catalog (which every authenticated user can read). The server never writes
-- these two columns; the client does, from the twin page.
--
-- Run once in the Supabase SQL editor. Idempotent. Until it runs the client
-- strips the two columns on PGRST204 and the twin lives in localStorage
-- alone (single device); every render then falls back to the catalog cell
-- or the generic model.
alter table public.profiles
  add column if not exists twin_url text,
  add column if not exists twin_key text;
comment on column public.profiles.twin_url is
  'Her digital twin: the reference image (Cloudinary URL) every look is rendered on — her face from the close-up, her line from the facts.';
comment on column public.profiles.twin_key is
  'Cache key for twin_url: a hash of the close-up URL, the facts, the sliders, the skin/hair overrides, gender and the twin style version. Same key = never redrawn.';

-- rollback:
-- alter table public.profiles drop column if exists twin_url, drop column if exists twin_key;
