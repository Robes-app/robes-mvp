-- migrate:up

-- Tags are hers (tags cleanup, 26 Nov): every account holds the eight defaults as its own
-- wear_for rows, which she may delete like any tag she made. The labels are WEAR_FOR_ALL in
-- @robes/core/filters. A row that already exists, deleted or not, is left as it is, so a default
-- she deleted is never brought back.
create function private.seed_user_tags(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into app.tags (user_id, kind, label, is_seed)
  select p_user_id, 'wear_for', l.label, true
  from unnest(array['Everyday', 'Work', 'Weekend', 'Evening', 'Occasion', 'Travel', 'Active',
    'Lounge']) as l(label)
  on conflict (user_id, kind, slug) do nothing;
$$;
revoke execute on function private.seed_user_tags(uuid) from public;

create function private.seed_tags_on_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_user_tags(new.id);
  return new;
end;
$$;
revoke execute on function private.seed_tags_on_user_created() from public;
create trigger seed_tags_on_user_created after insert on app.users
  for each row execute function private.seed_tags_on_user_created();

-- Every account already here gets them too; only adds, never changes a row she has.
select private.seed_user_tags(u.id) from app.users u;

-- A piece filed from its category is tagged only with tags still in her list: one she deleted
-- stays deleted (it was linked to the deleted row before).
create or replace function private.apply_tag_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  def record;
  v_slug text;
  v_tag uuid;
begin
  select * into def from private.piece_tag_defaults(new.category, new.category_l2);
  if not found then return null; end if;

  if new.season_source <> 'user' then
    update app.wardrobe_items set season_band = def.season_band where id = new.id;
  end if;

  foreach v_slug in array def.wear_slugs loop
    insert into app.tags (user_id, kind, label, is_seed)
    values (new.user_id, 'wear_for',
      coalesce((select l.label from app.wear_seed_labels l where l.slug = v_slug), initcap(v_slug)),
      true)
    on conflict (user_id, kind, slug) do nothing;
    v_tag := null;
    select t.id into v_tag from app.tags t
    where t.user_id = new.user_id and t.kind = 'wear_for' and t.slug = v_slug
      and t.deleted_at is null;
    if v_tag is null then continue; end if;
    insert into app.tag_pieces (user_id, tag_id, wardrobe_item_id, source)
    values (new.user_id, v_tag, new.id, 'inferred')
    on conflict do nothing;
  end loop;
  return null;
end;
$$;
revoke execute on function private.apply_tag_defaults() from public;

-- migrate:down
-- Forward-only.
