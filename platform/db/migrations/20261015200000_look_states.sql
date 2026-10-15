-- migrate:up
-- Look states (legacy migrations 24 + 25, docs/look-states-brief.md): one look, three states.
-- suggested = Robes' offer she hasn't chosen; draft = hers, unsaved; saved = a look she kept.
-- Only a saved look gathers wears, pins to a day, packs or shares; Discard deletes.
alter table app.looks
  add column status text not null default 'saved' check (status in ('suggested', 'draft', 'saved')),
  -- The key piece a set was styled around: a grouping, never a fourth kind of look.
  add column anchor_piece_id uuid,
  -- The generation record (the key_piece artifact) the look was minted from, and its place in it.
  add column set_id uuid,
  add column set_index smallint check (set_index between 0 and 2),
  -- The day her words named: offered on Save, never filed by itself.
  add column date_hint date,
  -- Robes' frame of the whole look: its picture in every state; edits re-draw it, her model never
  -- replaces it. frame_key is the rack the frame shows.
  add column frame_asset_id uuid,
  add column frame_key text check (char_length(frame_key) <= 400),
  -- How each piece is worn, by rack key (a piece id or a proposal key): {"<key>": "tucked at the front"}.
  add column styling jsonb check (styling is null or jsonb_typeof(styling) = 'object'),
  -- A draft's working notes per rack key: the piece a change replaced, or "back in from the prompt".
  add column edits jsonb check (edits is null or jsonb_typeof(edits) = 'object'),
  add foreign key (anchor_piece_id, user_id) references app.wardrobe_items (id, user_id)
    on delete set null (anchor_piece_id),
  add foreign key (set_id, user_id) references app.artifacts (id, user_id) on delete set null (set_id),
  add foreign key (frame_asset_id, user_id) references app.assets (id, user_id);

-- A saved look never carries working notes.
alter table app.looks
  add constraint looks_edits_on_drafts check (edits is null or status <> 'saved');

create index looks_user_status_idx on app.looks (user_id, status, created_at desc)
  where deleted_at is null;
create index looks_set_idx on app.looks (user_id, set_id) where set_id is not null;
create index looks_anchor_idx on app.looks (anchor_piece_id) where anchor_piece_id is not null;

-- The look prompt (docs/look-prompt-brief.md) is a job: one flash call reading her words against
-- the rack she sent.
alter table app.generation_jobs drop constraint generation_jobs_kind_check;
alter table app.generation_jobs add constraint generation_jobs_kind_check
  check (kind in ('fake', 'key_piece', 'daily', 'travel', 'travel_looks', 'look_render',
    'avatar_cell', 'wardrobe_analyse', 'stylenotes_analyse', 'receipt_read', 'alternates',
    'lookbuild_note', 'link_import', 'cutout', 'style_brief', 'look_ask'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
