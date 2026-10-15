-- migrate:up
-- Kill switches for the paid routes that had none; seeded on so nothing changes until an admin
-- turns one off in /admin/flags (keys and defaults mirror ADDED_FEATURE_FLAGS in @robes/core).
insert into app.feature_flags (key, enabled, description) values
  ('style.brief', true, 'Robes reads her wardrobe for her Style DNA brief (POST /me/dna/read, style_brief job)'),
  ('style.analyse', true, 'Colour and silhouette reads of her photos (POST /me/style/analyse)'),
  ('imports.link', true, 'Paste a shop link to import a piece (POST /imports/link)'),
  ('model.portraits', true, 'Draw a new model portrait when her picks need one (avatar_cell job; picks still save when off)')
on conflict (key) do nothing;

-- The look routes added since the baseline (prompt, restyle, frame, ask) share this switch.
update app.feature_flags
  set description = 'Style a piece and every look generation: the look prompt, restyle, frames and asks'
  where key = 'looks.generate';
update app.feature_flags
  set description = 'AI read of a wardrobe photo, single pieces and whole-photo reads'
  where key = 'wardrobe.analyse';

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
