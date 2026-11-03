-- migrate:up
-- When she confirmed her Style DNA (legacy profiles.style_dna.confirmed_at, set by beta's style
-- walk "Done"). Home's O1 step is done once this is set, or once two of brands · icons · styles
-- are filled. Null = never confirmed; old code ignores it.
alter table app.profiles add column style_confirmed_at timestamptz;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
