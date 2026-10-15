-- migrate:up
-- Parallel ports each re-declared the kind check; this restates the union of JOB_KINDS (guarded by job-kinds.test.ts).
alter table app.generation_jobs drop constraint generation_jobs_kind_check;
alter table app.generation_jobs add constraint generation_jobs_kind_check
  check (kind in ('fake', 'key_piece', 'daily', 'travel', 'travel_looks', 'look_render',
    'avatar_cell', 'wardrobe_analyse', 'stylenotes_analyse', 'receipt_read', 'alternates',
    'lookbuild_note', 'link_import', 'cutout', 'style_brief', 'wardrobe_pieces'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
