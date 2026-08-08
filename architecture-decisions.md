# Architecture decisions

## ADR-001 — Weekly-plan removal: sweep existing data (2026-08-08)

**Status**: accepted (founder decision, 2026-08-08).

**Context.** Week planning is moving to calendar day chips; the standalone
weekly artifact/console/engine surface (lookbook `type: 'weekly-plan'`,
`wkData` blobs, `POST /api/weekly` + `/api/weekly/day`, the `#wk-plan-modal`
planner, `#wk-day-modal`, `#wk-result-page`, the `weekly` tier in
`planned_days`) is retired ahead of that build. Existing users hold
weekly-plan artifacts and the `planned_days` rows they emitted
(`source_type: 'weekly'`); with the reader gone, those rows would paint
calendar days no surface can open.

**Decision — option A, sweep (clean, lossy at the calendar level).**

- `planned_days` rows with `source_type: 'weekly'` are **deleted** via the
  existing orphan path (`_pdDeleteSource`). Those planned days disappear
  from the home rail, month view and day peek.
- Weekly-plan lookbook artifacts are **archived, not destroyed**: their
  `type` flips to `'weekly-plan-archived'` (the column is unconstrained
  text, no migration). The `wkData` blob stays in the `data` jsonb, fully
  recoverable, but no client surface lists, renders or re-syncs the
  archived type.

**Mechanism.** Two layers, both idempotent:

1. **Lazy client sweep** — `_lbCloudPull` (dashboard-personalize.js)
   archives any `weekly-plan` row it pulls and fires `_pdDeleteSource` for
   its index rows; `snLoad()` filters `weekly-plan*` types from the local
   cache so a cached row can never render or be re-pushed as "local-only".
2. **One-shot ops sweep** — `supabase/weekly_plan_sweep.sql` (run once in
   the SQL editor) settles every account at once, including dormant ones.

The backfill tools (`scripts/backfill_planned_days.mjs`,
`supabase/planned_days_backfill.sql`) no longer emit weekly rows, so
re-running them cannot resurrect swept data.

**Related routing decisions taken with this ADR:**

- Read-time precedence in `_pdTier` is now `look (3) > daily (2) >
  travel (1)`; ties still resolve to latest `updated_at`.
- Typed week-shaped prompts ("plan my work week") route to the **clarify
  loop**: `weekly` is removed from `/api/intent`'s enum (the prompt now
  classifies a home-week plan as `unclear`) and from `_cbDetectIntent`;
  a stale card-armed `weekly` intent falls into the existing
  unroutable-legacy branch (clarify, never a blind render). The day-chip
  planning brief re-introduces week routing.
- The 5-piece milestone ("Plans your week") is dropped from `_MS_UNLOCKS`
  rather than relabelled — the ladder is 3 / 10 / 15 until the day-chip
  brief decides otherwise.
- `_rbTrackCfg`'s unknown-kind fallback moves from `_RB_TRACKS.weekly`
  to `_RB_TRACKS.daily`.

**Rollback.** Restore the pre-removal build, run
`update public.lookbook_items set type = 'weekly-plan' where type =
'weekly-plan-archived';`, then re-run the (pre-removal) backfill to
re-emit the index rows.
