-- migrate:up
-- Getting to know you, eight steps (onboarding PRD, 17 Nov): where she is in it, the capture steps
-- she skipped, and which version of the flow she has finished. Additive only: `onboarded_at` keeps
-- its meaning for older phone builds and the web, which never read these columns.
-- - first_run_step: the step she reached, so leaving and returning resumes there (R-S3).
-- - first_run_skipped: the capture steps she passed by (05–08), so Home knows what she has.
-- - first_run_version: the flow she finished; null for everyone today, so every account walks the
--   new flow once (Annie, 17 Nov: re-run for everyone).
alter table app.profiles
  add column first_run_version smallint
    check (first_run_version between 1 and 100),
  add column first_run_step text
    check (first_run_step in (
      'name', 'identity', 'styles', 'brands', 'looks', 'pieces', 'twin', 'outfit'
    )),
  add column first_run_skipped text[] not null default '{}'
    check (first_run_skipped <@ array['looks', 'pieces', 'twin', 'outfit']::text[]);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
