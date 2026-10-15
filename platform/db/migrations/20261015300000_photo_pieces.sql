-- migrate:up
-- Several pieces from one photograph (legacy 2026-10-13): the read job, crops cut from her photo
-- by the rendition pipeline, and pieces filed from a read exactly once per piece.
alter table app.generation_jobs drop constraint generation_jobs_kind_check;
alter table app.generation_jobs add constraint generation_jobs_kind_check
  check (kind in ('fake', 'key_piece', 'daily', 'travel', 'travel_looks', 'look_render',
    'avatar_cell', 'wardrobe_analyse', 'stylenotes_analyse', 'receipt_read', 'alternates',
    'lookbuild_note', 'link_import', 'cutout', 'wardrobe_pieces'));

-- A crop asset: RenditionFn cuts `crop` (fractions of the source's master) out of the original.
alter table app.assets
  add column source_asset_id uuid,
  add column crop jsonb check (crop is null or jsonb_typeof(crop) = 'object'),
  add constraint assets_source_fk foreign key (source_asset_id, user_id)
    references app.assets (id, user_id);
create index assets_source_idx on app.assets (source_asset_id) where source_asset_id is not null;

alter table app.wardrobe_items
  add column source_asset_id uuid,
  add column source_index smallint check (source_index between 0 and 7),
  add constraint wardrobe_items_source_fk foreign key (source_asset_id, user_id)
    references app.assets (id, user_id),
  add constraint wardrobe_items_source_pair check ((source_asset_id is null) = (source_index is null));
create unique index wardrobe_items_source_unique on app.wardrobe_items (user_id, source_asset_id, source_index)
  where source_asset_id is not null and deleted_at is null;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
