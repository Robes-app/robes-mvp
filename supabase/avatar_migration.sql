-- Migration 20 — Her model (avatar) on the profile (2026-08-25)
-- Run once in the Supabase SQL editor.
--
-- avatar_id     — the catalog cell her model resolves to, e.g. 'w-s3-h1-hg-ll'
--                 (gender - skin index - hair index - figure key - nudges).
--                 Deterministic from avatar_prefs; stored flat so the render
--                 pipeline and /admin can read it without re-deriving.
-- avatar_prefs  — her explicit choices + kept flag:
--                 { skin: int|null, hair: int|null, nudges: {line?,frame?}, kept: bool, v: 1 }
--                 null skin/hair = "propose from the analysis" (the mapper decides).
--
-- Until this runs, the client keeps the model in localStorage only
-- (rb_model__<uid>) and the cloud write no-ops with a console warning —
-- the standard pre-migration degrade.

alter table public.profiles
  add column if not exists avatar_id text,
  add column if not exists avatar_prefs jsonb;

comment on column public.profiles.avatar_id is
  'Her model: resolved avatar catalog cell (deterministic from avatar_prefs + style_dna).';
comment on column public.profiles.avatar_prefs is
  'Her model: explicit choices {skin, hair, nudges, kept, v} — null skin/hair means propose from the analysis.';

-- No new RLS needed: profiles already carries own-row policies, and these
-- columns ride the same row.
