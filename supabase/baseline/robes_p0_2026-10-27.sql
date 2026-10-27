-- Robes_p0 (production, ayowpaknssulsqqvwpqx) as it stood on 2026-10-27: the "beginning of time"
-- for staging. Structure of schema public (every legacy migration 1–29 applied), beta's sign-up
-- trigger on auth.users, the vector extension where production keeps it, and the three reference
-- tables' rows. No user data. Taken read-only with pg_dump 17.4 (supabase/CLAUDE.md).
-- Applying it to a database that already has these tables fails: it is for an empty public schema.

create extension if not exists vector with schema public;
-- The dump's `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` lines are left out: Supabase sets them on
-- every project itself, and the postgres role may not change them.

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_user_overview(integer, integer, text, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_user_overview(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text, p_user uuid DEFAULT NULL::uuid, p_sort text DEFAULT 'created_at'::text, p_dir text DEFAULT 'desc'::text) RETURNS TABLE(id uuid, email text, first_name text, created_at timestamp with time zone, onboarded_at timestamp with time zone, last_sign_in_at timestamp with time zone, wardrobe_count bigint, wishlist_count bigint, lookbook_count bigint, feedback_count bigint, last_event_at timestamp with time zone, is_admin boolean, total_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select * from (
    select
      u.id, u.email::text as email, p.first_name, u.created_at,
      p.onboarded_at, u.last_sign_in_at,
      (select count(*) from public.wardrobe_items w where w.user_id = u.id) as wardrobe_count,
      (select count(*) from public.wishlist_items wl where wl.user_id = u.id) as wishlist_count,
      (select count(*) from public.lookbook_items l where l.user_id = u.id) as lookbook_count,
      (select count(*) from public.feedback f where f.user_id = u.id) as feedback_count,
      (select max(e.created_at) from public.events e where e.user_id = u.id) as last_event_at,
      coalesce(p.is_admin, false) as is_admin,
      count(*) over () as total_count
    from auth.users u
    left join public.profiles p on p.id = u.id
    where public.is_admin()
      and (p_user is null or u.id = p_user)
      and (p_search is null or p_search = ''
           or u.email ilike '%' || p_search || '%'
           or coalesce(p.first_name, '') ilike '%' || p_search || '%')
  ) t
  order by
    case when p_sort = 'name'         and p_dir = 'asc'  then lower(coalesce(t.first_name, '')) end asc  nulls last,
    case when p_sort = 'name'         and p_dir <> 'asc' then lower(coalesce(t.first_name, '')) end desc nulls last,
    case when p_sort = 'email'        and p_dir = 'asc'  then lower(t.email) end asc  nulls last,
    case when p_sort = 'email'        and p_dir <> 'asc' then lower(t.email) end desc nulls last,
    case when p_sort = 'onboarded'    and p_dir = 'asc'  then t.onboarded_at end asc  nulls last,
    case when p_sort = 'onboarded'    and p_dir <> 'asc' then t.onboarded_at end desc nulls last,
    case when p_sort = 'wardrobe'     and p_dir = 'asc'  then t.wardrobe_count end asc,
    case when p_sort = 'wardrobe'     and p_dir <> 'asc' then t.wardrobe_count end desc,
    case when p_sort = 'lookbook'     and p_dir = 'asc'  then t.lookbook_count end asc,
    case when p_sort = 'lookbook'     and p_dir <> 'asc' then t.lookbook_count end desc,
    case when p_sort = 'feedback'     and p_dir = 'asc'  then t.feedback_count end asc,
    case when p_sort = 'feedback'     and p_dir <> 'asc' then t.feedback_count end desc,
    case when p_sort = 'last_event'   and p_dir = 'asc'  then t.last_event_at end asc  nulls last,
    case when p_sort = 'last_event'   and p_dir <> 'asc' then t.last_event_at end desc nulls last,
    case when p_sort = 'last_sign_in' and p_dir = 'asc'  then t.last_sign_in_at end asc  nulls last,
    case when p_sort = 'last_sign_in' and p_dir <> 'asc' then t.last_sign_in_at end desc nulls last,
    case when p_sort = 'created_at'   and p_dir = 'asc'  then t.created_at end asc,
    t.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0)
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, first_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;


--
-- Name: rb_apply_tag_defaults(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rb_apply_tag_defaults(p_item_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  it     record;
  def    record;
  v_slug text;   -- v_ prefix: a bare `slug` would be ambiguous against the
  v_tid  uuid;   -- slug COLUMN inside the statements below
begin
  select id, user_id, category, category_l2, season_source
    into it from public.wardrobe_items where id = p_item_id;
  if not found then return; end if;

  select * into def from public.rb_piece_defaults(it.category, it.category_l2);
  if not found then return; end if;

  -- The two axes are guarded SEPARATELY. Guarding the whole function on
  -- season_source would mean that picking a season while adding a piece
  -- silently suppressed its wear pre-fill too — two unrelated decisions
  -- coupled by an early return.
  if it.season_source <> 'user' then
    update public.wardrobe_items
       set season_band = def.season_band, season_source = 'inferred'
     where id = it.id;
  end if;

  foreach v_slug in array def.wear_slugs loop
    insert into public.tags (user_id, kind, label, slug, is_seed)
    values (
      it.user_id, 'wear_for',
      coalesce((select l.label from public.wear_seed_labels l where l.slug = v_slug),
               initcap(v_slug)),
      v_slug, true)
    on conflict (user_id, kind, slug) do nothing;

    select t.id into v_tid from public.tags t
     where t.user_id = it.user_id and t.kind = 'wear_for' and t.slug = v_slug;

    if v_tid is not null then
      insert into public.tag_pieces (wardrobe_item_id, tag_id, source)
      values (it.id, v_tid, 'inferred')
      on conflict do nothing;
    end if;
  end loop;
end $$;


--
-- Name: rb_piece_defaults(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rb_piece_defaults(p_category text, p_l2 text) RETURNS TABLE(season_band text, wear_slugs text[])
    LANGUAGE sql STABLE
    AS $$
  with sheet as (
    select coalesce(
      (select t.sheet_l1 from public.wardrobe_taxonomy t where t.l2 = p_l2 limit 1),
      p_category
    ) as sheet_l1
  )
  select d.season_band, d.wear_slugs
  from sheet s
  join public.wardrobe_tag_defaults d
    on d.sheet_l1 = s.sheet_l1
   and coalesce(d.l2, '') = coalesce(
         (select t.l2 from public.wardrobe_taxonomy t where t.l2 = p_l2 limit 1), '')
  limit 1;
$$;


--
-- Name: rb_tag_defaults_trg(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rb_tag_defaults_trg() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform public.rb_apply_tag_defaults(new.id);
  return null;
end $$;


--
-- Name: rb_tag_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rb_tag_slug(p_label text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        regexp_replace(
          translate(
            -- ligatures first: translate() is strictly 1:1 and cannot expand
            replace(replace(replace(lower(coalesce(p_label, '')),
              'æ', 'ae'), 'œ', 'oe'), 'ß', 'ss'),
            'áàâäãåāăąéèêëēĕėęěíìîïĩīĭįóòôöõøōŏőúùûüũūŭůűųñńňçćčýÿŷšśşžźżđłŕřťďğ',
            'aaaaaaaaaeeeeeeeeeiiiiiiiiooooooooouuuuuuuuuunnncccyyysssszzzdlrrtdg'),
          '[^a-z0-9]+', '-', 'g'),
        '-{2,}', '-', 'g')
    ), '');
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: sync_wardrobe_items_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_wardrobe_items_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set wardrobe_items_count = wardrobe_items_count + 1 where id = new.user_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.profiles set wardrobe_items_count = greatest(wardrobe_items_count - 1, 0) where id = old.user_id;
    return old;
  end if;
  return null;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: avatar_cells; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avatar_cells (
    id text NOT NULL,
    image_url text NOT NULL,
    descriptor text,
    status text DEFAULT 'ready'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    lookbook_item_id bigint,
    track text,
    rating integer,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_rating_check CHECK ((rating = ANY (ARRAY[0, 1])))
);


--
-- Name: generation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    endpoint text NOT NULL,
    model text,
    tokens_used integer,
    latency_ms integer,
    status text NOT NULL,
    prompt text,
    response jsonb,
    detail jsonb DEFAULT '{}'::jsonb,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: look_pieces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.look_pieces (
    look_id uuid NOT NULL,
    wardrobe_item_id uuid NOT NULL,
    slot text,
    "position" smallint,
    role text
);


--
-- Name: lookbook_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lookbook_items (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    type text DEFAULT 'key-piece'::text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    subtitle text DEFAULT ''::text NOT NULL,
    img text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    share_id text,
    is_public boolean DEFAULT false NOT NULL
);


--
-- Name: looks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.looks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    name_provisional boolean DEFAULT true NOT NULL,
    tags text[],
    note text,
    photo_url text,
    source text DEFAULT 'wear'::text NOT NULL,
    origin_look_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    climate_band text DEFAULT 'year_round'::text NOT NULL,
    climate_source text DEFAULT 'derived'::text NOT NULL,
    proposals jsonb,
    render_url text,
    render_key text,
    styling jsonb,
    status text DEFAULT 'saved'::text NOT NULL,
    anchor_piece_id uuid,
    set_id text,
    set_index smallint,
    CONSTRAINT looks_climate_band_check CHECK ((climate_band = ANY (ARRAY['spring_summer'::text, 'autumn_winter'::text, 'year_round'::text]))),
    CONSTRAINT looks_climate_source_check CHECK ((climate_source = ANY (ARRAY['derived'::text, 'user'::text]))),
    CONSTRAINT looks_status_check CHECK ((status = ANY (ARRAY['suggested'::text, 'draft'::text, 'saved'::text])))
);


--
-- Name: COLUMN looks.render_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.render_url IS 'The look rendered on her model (Cloudinary URL) — display: render_url -> photo_url -> mosaic.';


--
-- Name: COLUMN looks.render_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.render_key IS 'Cache key for render_url: avatar_id | sorted piece ids. Same key = never re-render.';


--
-- Name: COLUMN looks.styling; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.looks.styling IS 'How each piece is worn, by wardrobe_item id (the look prompt, phase 2).';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    ref text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: planned_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planned_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    day_date date NOT NULL,
    source_type text NOT NULL,
    source_id text NOT NULL,
    day_index integer DEFAULT 0 NOT NULL,
    slot text DEFAULT 'day'::text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    activity text,
    headline text,
    thumb_urls jsonb DEFAULT '[]'::jsonb,
    item_ids jsonb DEFAULT '[]'::jsonb,
    anchor_item_ids jsonb DEFAULT '[]'::jsonb,
    ootd_photo_url text,
    worn_at timestamp with time zone,
    environment text DEFAULT 'beta'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT planned_days_slot_check CHECK ((slot = ANY (ARRAY['day'::text, 'evening'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text,
    style_icons text[] DEFAULT '{}'::text[],
    budget text,
    wardrobe_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_name text,
    mobile text,
    season text,
    undertone text,
    contrast text,
    body_type text,
    splurge_categories text[] DEFAULT '{}'::text[],
    annual_spend text,
    headshot_url text,
    full_length_url text,
    colour_analysis jsonb,
    silhouette_analysis jsonb,
    style_dna jsonb DEFAULT '{}'::jsonb NOT NULL,
    wardrobe_items_count integer DEFAULT 0 NOT NULL,
    onboarded_at timestamp with time zone,
    instagram_handle text,
    is_admin boolean DEFAULT false NOT NULL,
    gender_identity text DEFAULT 'woman'::text NOT NULL,
    avatar_id text,
    avatar_prefs jsonb,
    notification_prefs jsonb DEFAULT '{}'::jsonb NOT NULL,
    inbox_address text,
    twin_url text,
    twin_key text,
    CONSTRAINT profiles_gender_identity_check CHECK ((gender_identity = ANY (ARRAY['woman'::text, 'man'::text, 'unspecified'::text])))
);


--
-- Name: COLUMN profiles.avatar_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.avatar_id IS 'Her model: resolved avatar catalog cell (deterministic from avatar_prefs + style_dna).';


--
-- Name: COLUMN profiles.avatar_prefs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.avatar_prefs IS 'Her model: explicit choices {skin, hair, nudges, kept, v} — null skin/hair means propose from the analysis.';


--
-- Name: COLUMN profiles.twin_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.twin_url IS 'Her digital twin: the reference image (Cloudinary URL) every look is rendered on — her face from the close-up, her line from the facts.';


--
-- Name: COLUMN profiles.twin_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.twin_key IS 'Cache key for twin_url: a hash of the close-up URL, the facts, the sliders, the skin/hair overrides, gender and the twin style version. Same key = never redrawn.';


--
-- Name: prompt_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt text NOT NULL,
    response text NOT NULL,
    tokens_used integer,
    model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tag_looks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_looks (
    look_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    source text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tag_looks_source_check CHECK ((source = ANY (ARRAY['inferred'::text, 'user'::text])))
);


--
-- Name: tag_pieces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_pieces (
    wardrobe_item_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    source text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tag_pieces_source_check CHECK ((source = ANY (ARRAY['inferred'::text, 'user'::text])))
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    label text NOT NULL,
    slug text NOT NULL,
    is_seed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tags_kind_check CHECK ((kind = ANY (ARRAY['wear_for'::text, 'vibe'::text])))
);


--
-- Name: wardrobe_inbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wardrobe_inbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source text DEFAULT 'receipt'::text NOT NULL,
    retailer text,
    order_ref text,
    subject text,
    from_email text,
    provider_id text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'held'::text NOT NULL,
    filed_ids jsonb,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone,
    CONSTRAINT wardrobe_inbox_status_check CHECK ((status = ANY (ARRAY['held'::text, 'filed'::text, 'dismissed'::text])))
);


--
-- Name: wardrobe_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wardrobe_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    category text DEFAULT 'Other'::text NOT NULL,
    color text,
    brand text,
    notes text,
    image_url text,
    times_worn integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_dna jsonb DEFAULT '{}'::jsonb NOT NULL,
    hero_position smallint,
    seasons text[],
    occasions text[],
    price numeric(10,2),
    fit_confidence text,
    sentiment text,
    category_l2 text,
    category_l3 text,
    season_band text DEFAULT 'year_round'::text NOT NULL,
    season_source text DEFAULT 'inferred'::text NOT NULL,
    size text,
    currency text,
    colour_shade text,
    colour_extra text[] DEFAULT '{}'::text[] NOT NULL,
    print text,
    material text,
    CONSTRAINT wardrobe_items_season_band_check CHECK ((season_band = ANY (ARRAY['spring_summer'::text, 'autumn_winter'::text, 'year_round'::text]))),
    CONSTRAINT wardrobe_items_season_source_check CHECK ((season_source = ANY (ARRAY['inferred'::text, 'user'::text])))
);


--
-- Name: wardrobe_tag_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wardrobe_tag_defaults (
    sheet_l1 text NOT NULL,
    l2 text,
    season_band text NOT NULL,
    wear_slugs text[] NOT NULL
);


--
-- Name: wardrobe_taxonomy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wardrobe_taxonomy (
    l1 text NOT NULL,
    sheet_l1 text NOT NULL,
    l2 text NOT NULL,
    l3 text NOT NULL
);


--
-- Name: wear_seed_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wear_seed_labels (
    slug text NOT NULL,
    label text NOT NULL
);


--
-- Name: wears; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wears (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    look_id uuid NOT NULL,
    user_id uuid NOT NULL,
    worn_on date NOT NULL,
    piece_ids uuid[] NOT NULL,
    note text,
    source text,
    source_id text,
    confirmed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    category text DEFAULT 'Other'::text NOT NULL,
    color text,
    brand text,
    note text,
    image_url text,
    price numeric(10,2),
    source_type text DEFAULT 'photo'::text NOT NULL,
    source_label text,
    source_url text,
    item_dna jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    size text,
    currency text,
    category_l2 text,
    category_l3 text,
    colour_shade text,
    colour_extra text[] DEFAULT '{}'::text[] NOT NULL,
    print text,
    material text
);


--
-- Name: avatar_cells avatar_cells_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_cells
    ADD CONSTRAINT avatar_cells_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: generation_log generation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_log
    ADD CONSTRAINT generation_log_pkey PRIMARY KEY (id);


--
-- Name: look_pieces look_pieces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.look_pieces
    ADD CONSTRAINT look_pieces_pkey PRIMARY KEY (look_id, wardrobe_item_id);


--
-- Name: lookbook_items lookbook_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookbook_items
    ADD CONSTRAINT lookbook_items_pkey PRIMARY KEY (user_id, id);


--
-- Name: looks looks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.looks
    ADD CONSTRAINT looks_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_user_id_kind_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_kind_ref_key UNIQUE (user_id, kind, ref);


--
-- Name: planned_days planned_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planned_days
    ADD CONSTRAINT planned_days_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: prompt_history prompt_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_history
    ADD CONSTRAINT prompt_history_pkey PRIMARY KEY (id);


--
-- Name: tag_looks tag_looks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_looks
    ADD CONSTRAINT tag_looks_pkey PRIMARY KEY (look_id, tag_id);


--
-- Name: tag_pieces tag_pieces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_pieces
    ADD CONSTRAINT tag_pieces_pkey PRIMARY KEY (wardrobe_item_id, tag_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: wardrobe_inbox wardrobe_inbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_inbox
    ADD CONSTRAINT wardrobe_inbox_pkey PRIMARY KEY (id);


--
-- Name: wardrobe_items wardrobe_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_items
    ADD CONSTRAINT wardrobe_items_pkey PRIMARY KEY (id);


--
-- Name: wardrobe_taxonomy wardrobe_taxonomy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_taxonomy
    ADD CONSTRAINT wardrobe_taxonomy_pkey PRIMARY KEY (l2, l3);


--
-- Name: wear_seed_labels wear_seed_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wear_seed_labels
    ADD CONSTRAINT wear_seed_labels_pkey PRIMARY KEY (slug);


--
-- Name: wears wears_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wears
    ADD CONSTRAINT wears_pkey PRIMARY KEY (id);


--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);


--
-- Name: events_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_created_idx ON public.events USING btree (created_at DESC);


--
-- Name: events_env_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_env_idx ON public.events USING btree (environment);


--
-- Name: events_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_type_idx ON public.events USING btree (event_type);


--
-- Name: events_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_user_idx ON public.events USING btree (user_id);


--
-- Name: feedback_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_created_idx ON public.feedback USING btree (created_at DESC);


--
-- Name: feedback_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_item_idx ON public.feedback USING btree (lookbook_item_id);


--
-- Name: feedback_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_user_idx ON public.feedback USING btree (user_id);


--
-- Name: genlog_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX genlog_created_idx ON public.generation_log USING btree (created_at DESC);


--
-- Name: genlog_endpoint_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX genlog_endpoint_idx ON public.generation_log USING btree (endpoint);


--
-- Name: genlog_env_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX genlog_env_idx ON public.generation_log USING btree (environment);


--
-- Name: genlog_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX genlog_status_idx ON public.generation_log USING btree (status);


--
-- Name: genlog_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX genlog_user_idx ON public.generation_log USING btree (user_id);


--
-- Name: idx_look_pieces_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_look_pieces_item ON public.look_pieces USING btree (wardrobe_item_id);


--
-- Name: idx_lookbook_share_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_lookbook_share_id ON public.lookbook_items USING btree (share_id) WHERE (share_id IS NOT NULL);


--
-- Name: idx_lookbook_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lookbook_user_created ON public.lookbook_items USING btree (user_id, created_at DESC);


--
-- Name: idx_looks_climate_band; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_looks_climate_band ON public.looks USING btree (user_id, climate_band);


--
-- Name: idx_looks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_looks_user ON public.looks USING btree (user_id, created_at DESC);


--
-- Name: idx_profiles_style_dna; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_style_dna ON public.profiles USING gin (style_dna);


--
-- Name: idx_tag_defaults_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tag_defaults_key ON public.wardrobe_tag_defaults USING btree (sheet_l1, COALESCE(l2, ''::text));


--
-- Name: idx_tag_looks_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tag_looks_tag ON public.tag_looks USING btree (tag_id);


--
-- Name: idx_tag_pieces_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tag_pieces_tag ON public.tag_pieces USING btree (tag_id);


--
-- Name: idx_tags_user_kind_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tags_user_kind_slug ON public.tags USING btree (user_id, kind, slug);


--
-- Name: idx_wardrobe_hero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_hero ON public.wardrobe_items USING btree (user_id, hero_position) WHERE (hero_position IS NOT NULL);


--
-- Name: idx_wardrobe_item_dna; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_item_dna ON public.wardrobe_items USING gin (item_dna);


--
-- Name: idx_wardrobe_items_category_l2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_items_category_l2 ON public.wardrobe_items USING btree (category_l2) WHERE (category_l2 IS NOT NULL);


--
-- Name: idx_wardrobe_items_colour_shade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_items_colour_shade ON public.wardrobe_items USING btree (user_id, colour_shade) WHERE (colour_shade IS NOT NULL);


--
-- Name: idx_wardrobe_items_material; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_items_material ON public.wardrobe_items USING btree (user_id, material) WHERE (material IS NOT NULL);


--
-- Name: idx_wardrobe_items_print; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_items_print ON public.wardrobe_items USING btree (user_id, print) WHERE (print IS NOT NULL);


--
-- Name: idx_wardrobe_season_band; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wardrobe_season_band ON public.wardrobe_items USING btree (user_id, season_band);


--
-- Name: idx_wears_look; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wears_look ON public.wears USING btree (look_id, worn_on DESC);


--
-- Name: idx_wears_unique_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_wears_unique_day ON public.wears USING btree (user_id, look_id, worn_on);


--
-- Name: idx_wears_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wears_user ON public.wears USING btree (user_id, worn_on DESC);


--
-- Name: idx_wishlist_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_user ON public.wishlist_items USING btree (user_id);


--
-- Name: looks_anchor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX looks_anchor_idx ON public.looks USING btree (anchor_piece_id) WHERE (anchor_piece_id IS NOT NULL);


--
-- Name: looks_set_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX looks_set_idx ON public.looks USING btree (set_id) WHERE (set_id IS NOT NULL);


--
-- Name: looks_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX looks_status_idx ON public.looks USING btree (user_id, status);


--
-- Name: notifications_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_kind_idx ON public.notifications USING btree (kind, sent_at DESC);


--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, sent_at DESC);


--
-- Name: planned_days_source_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX planned_days_source_slot ON public.planned_days USING btree (user_id, source_id, day_index, slot);


--
-- Name: planned_days_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planned_days_user_date ON public.planned_days USING btree (user_id, day_date);


--
-- Name: profiles_inbox_address_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX profiles_inbox_address_key ON public.profiles USING btree (inbox_address) WHERE (inbox_address IS NOT NULL);


--
-- Name: prompt_history_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prompt_history_user_id_idx ON public.prompt_history USING btree (user_id, created_at DESC);


--
-- Name: wardrobe_inbox_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wardrobe_inbox_user_idx ON public.wardrobe_inbox USING btree (user_id, status, received_at DESC);


--
-- Name: wardrobe_items_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wardrobe_items_user_id_idx ON public.wardrobe_items USING btree (user_id);


--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: wardrobe_items trg_wardrobe_tag_defaults; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wardrobe_tag_defaults AFTER INSERT ON public.wardrobe_items FOR EACH ROW EXECUTE FUNCTION public.rb_tag_defaults_trg();


--
-- Name: wardrobe_items wardrobe_items_count_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wardrobe_items_count_sync AFTER INSERT OR DELETE ON public.wardrobe_items FOR EACH ROW EXECUTE FUNCTION public.sync_wardrobe_items_count();


--
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: generation_log generation_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_log
    ADD CONSTRAINT generation_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: look_pieces look_pieces_look_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.look_pieces
    ADD CONSTRAINT look_pieces_look_id_fkey FOREIGN KEY (look_id) REFERENCES public.looks(id) ON DELETE CASCADE;


--
-- Name: look_pieces look_pieces_wardrobe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.look_pieces
    ADD CONSTRAINT look_pieces_wardrobe_item_id_fkey FOREIGN KEY (wardrobe_item_id) REFERENCES public.wardrobe_items(id) ON DELETE CASCADE;


--
-- Name: lookbook_items lookbook_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lookbook_items
    ADD CONSTRAINT lookbook_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: looks looks_anchor_piece_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.looks
    ADD CONSTRAINT looks_anchor_piece_id_fkey FOREIGN KEY (anchor_piece_id) REFERENCES public.wardrobe_items(id) ON DELETE SET NULL;


--
-- Name: looks looks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.looks
    ADD CONSTRAINT looks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: planned_days planned_days_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planned_days
    ADD CONSTRAINT planned_days_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_history prompt_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_history
    ADD CONSTRAINT prompt_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tag_looks tag_looks_look_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_looks
    ADD CONSTRAINT tag_looks_look_id_fkey FOREIGN KEY (look_id) REFERENCES public.looks(id) ON DELETE CASCADE;


--
-- Name: tag_looks tag_looks_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_looks
    ADD CONSTRAINT tag_looks_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tag_pieces tag_pieces_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_pieces
    ADD CONSTRAINT tag_pieces_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tag_pieces tag_pieces_wardrobe_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_pieces
    ADD CONSTRAINT tag_pieces_wardrobe_item_id_fkey FOREIGN KEY (wardrobe_item_id) REFERENCES public.wardrobe_items(id) ON DELETE CASCADE;


--
-- Name: tags tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wardrobe_inbox wardrobe_inbox_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_inbox
    ADD CONSTRAINT wardrobe_inbox_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wardrobe_items wardrobe_items_taxonomy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_items
    ADD CONSTRAINT wardrobe_items_taxonomy_fkey FOREIGN KEY (category_l2, category_l3) REFERENCES public.wardrobe_taxonomy(l2, l3);


--
-- Name: wardrobe_items wardrobe_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wardrobe_items
    ADD CONSTRAINT wardrobe_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wears wears_look_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wears
    ADD CONSTRAINT wears_look_id_fkey FOREIGN KEY (look_id) REFERENCES public.looks(id) ON DELETE CASCADE;


--
-- Name: wears wears_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wears
    ADD CONSTRAINT wears_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wardrobe_items Users own their wardrobe items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their wardrobe items" ON public.wardrobe_items USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlist_items Users own their wishlist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their wishlist items" ON public.wishlist_items USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: avatar_cells; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avatar_cells ENABLE ROW LEVEL SECURITY;

--
-- Name: avatar_cells avatar_cells_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY avatar_cells_read ON public.avatar_cells FOR SELECT TO authenticated USING (true);


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_admin_read ON public.events FOR SELECT USING (public.is_admin());


--
-- Name: events events_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_own_insert ON public.events FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback feedback_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_admin_read ON public.feedback FOR SELECT USING (public.is_admin());


--
-- Name: feedback feedback_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_own_insert ON public.feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: generation_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: generation_log genlog_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY genlog_admin_read ON public.generation_log FOR SELECT USING (public.is_admin());


--
-- Name: look_pieces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.look_pieces ENABLE ROW LEVEL SECURITY;

--
-- Name: look_pieces look_pieces_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY look_pieces_delete_own ON public.look_pieces FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = look_pieces.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: look_pieces look_pieces_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY look_pieces_insert_own ON public.look_pieces FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = look_pieces.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: look_pieces look_pieces_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY look_pieces_select_own ON public.look_pieces FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = look_pieces.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: look_pieces look_pieces_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY look_pieces_update_own ON public.look_pieces FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = look_pieces.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: lookbook_items lookbook_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lookbook_admin_read ON public.lookbook_items FOR SELECT USING (public.is_admin());


--
-- Name: lookbook_items lookbook_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lookbook_delete_own ON public.lookbook_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: lookbook_items lookbook_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lookbook_insert_own ON public.lookbook_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lookbook_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lookbook_items ENABLE ROW LEVEL SECURITY;

--
-- Name: lookbook_items lookbook_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lookbook_select_own ON public.lookbook_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: lookbook_items lookbook_select_shared; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lookbook_select_shared ON public.lookbook_items FOR SELECT TO anon USING ((is_public = true));


--
-- Name: lookbook_items lookbook_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lookbook_update_own ON public.lookbook_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: looks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.looks ENABLE ROW LEVEL SECURITY;

--
-- Name: looks looks_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY looks_delete_own ON public.looks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: looks looks_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY looks_insert_own ON public.looks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: looks looks_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY looks_select_own ON public.looks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: looks looks_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY looks_update_own ON public.looks FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_admin_read ON public.notifications FOR SELECT USING (public.is_admin());


--
-- Name: notifications notifications_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_own_read ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: planned_days; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.planned_days ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_days planned_days_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY planned_days_admin_read ON public.planned_days FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: planned_days planned_days_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY planned_days_own ON public.planned_days TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles: own row insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: own row insert" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles: own row select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: own row select" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles profiles: own row update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: own row update" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT USING (public.is_admin());


--
-- Name: prompt_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_history prompt_history: own rows insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "prompt_history: own rows insert" ON public.prompt_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_history prompt_history: own rows select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "prompt_history: own rows select" ON public.prompt_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_history prompt_history_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prompt_history_admin_read ON public.prompt_history FOR SELECT USING (public.is_admin());


--
-- Name: wardrobe_tag_defaults tag_defaults_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_defaults_read ON public.wardrobe_tag_defaults FOR SELECT TO authenticated USING (true);


--
-- Name: tag_looks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tag_looks ENABLE ROW LEVEL SECURITY;

--
-- Name: tag_looks tag_looks_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_looks_admin_read ON public.tag_looks FOR SELECT USING (public.is_admin());


--
-- Name: tag_looks tag_looks_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_looks_delete_own ON public.tag_looks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = tag_looks.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: tag_looks tag_looks_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_looks_insert_own ON public.tag_looks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = tag_looks.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: tag_looks tag_looks_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_looks_select_own ON public.tag_looks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = tag_looks.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: tag_looks tag_looks_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_looks_update_own ON public.tag_looks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.looks l
  WHERE ((l.id = tag_looks.look_id) AND (l.user_id = auth.uid())))));


--
-- Name: tag_pieces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tag_pieces ENABLE ROW LEVEL SECURITY;

--
-- Name: tag_pieces tag_pieces_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_pieces_admin_read ON public.tag_pieces FOR SELECT USING (public.is_admin());


--
-- Name: tag_pieces tag_pieces_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_pieces_delete_own ON public.tag_pieces FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.wardrobe_items w
  WHERE ((w.id = tag_pieces.wardrobe_item_id) AND (w.user_id = auth.uid())))));


--
-- Name: tag_pieces tag_pieces_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_pieces_insert_own ON public.tag_pieces FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.wardrobe_items w
  WHERE ((w.id = tag_pieces.wardrobe_item_id) AND (w.user_id = auth.uid())))));


--
-- Name: tag_pieces tag_pieces_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_pieces_select_own ON public.tag_pieces FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.wardrobe_items w
  WHERE ((w.id = tag_pieces.wardrobe_item_id) AND (w.user_id = auth.uid())))));


--
-- Name: tag_pieces tag_pieces_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tag_pieces_update_own ON public.tag_pieces FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.wardrobe_items w
  WHERE ((w.id = tag_pieces.wardrobe_item_id) AND (w.user_id = auth.uid())))));


--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: tags tags_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tags_admin_read ON public.tags FOR SELECT USING (public.is_admin());


--
-- Name: tags tags_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tags_delete_own ON public.tags FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tags tags_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tags_insert_own ON public.tags FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tags tags_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tags_select_own ON public.tags FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tags tags_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tags_update_own ON public.tags FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wardrobe_taxonomy taxonomy_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY taxonomy_read ON public.wardrobe_taxonomy FOR SELECT TO authenticated USING (true);


--
-- Name: wardrobe_items wardrobe_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wardrobe_admin_read ON public.wardrobe_items FOR SELECT USING (public.is_admin());


--
-- Name: wardrobe_inbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wardrobe_inbox ENABLE ROW LEVEL SECURITY;

--
-- Name: wardrobe_inbox wardrobe_inbox_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wardrobe_inbox_own_delete ON public.wardrobe_inbox FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: wardrobe_inbox wardrobe_inbox_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wardrobe_inbox_own_read ON public.wardrobe_inbox FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: wardrobe_inbox wardrobe_inbox_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wardrobe_inbox_own_update ON public.wardrobe_inbox FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wardrobe_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

--
-- Name: wardrobe_tag_defaults; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wardrobe_tag_defaults ENABLE ROW LEVEL SECURITY;

--
-- Name: wardrobe_taxonomy; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wardrobe_taxonomy ENABLE ROW LEVEL SECURITY;

--
-- Name: wear_seed_labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wear_seed_labels ENABLE ROW LEVEL SECURITY;

--
-- Name: wears; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wears ENABLE ROW LEVEL SECURITY;

--
-- Name: wears wears_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wears_delete_own ON public.wears FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: wears wears_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wears_insert_own ON public.wears FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wears wears_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wears_select_own ON public.wears FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wishlist_items wishlist_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_admin_read ON public.wishlist_items FOR SELECT USING (public.is_admin());


--
-- Name: wishlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION admin_user_overview(p_limit integer, p_offset integer, p_search text, p_user uuid, p_sort text, p_dir text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_user_overview(p_limit integer, p_offset integer, p_search text, p_user uuid, p_sort text, p_dir text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_user_overview(p_limit integer, p_offset integer, p_search text, p_user uuid, p_sort text, p_dir text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_user_overview(p_limit integer, p_offset integer, p_search text, p_user uuid, p_sort text, p_dir text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION rb_apply_tag_defaults(p_item_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rb_apply_tag_defaults(p_item_id uuid) TO anon;
GRANT ALL ON FUNCTION public.rb_apply_tag_defaults(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.rb_apply_tag_defaults(p_item_id uuid) TO service_role;


--
-- Name: FUNCTION rb_piece_defaults(p_category text, p_l2 text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rb_piece_defaults(p_category text, p_l2 text) TO anon;
GRANT ALL ON FUNCTION public.rb_piece_defaults(p_category text, p_l2 text) TO authenticated;
GRANT ALL ON FUNCTION public.rb_piece_defaults(p_category text, p_l2 text) TO service_role;


--
-- Name: FUNCTION rb_tag_defaults_trg(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rb_tag_defaults_trg() TO anon;
GRANT ALL ON FUNCTION public.rb_tag_defaults_trg() TO authenticated;
GRANT ALL ON FUNCTION public.rb_tag_defaults_trg() TO service_role;


--
-- Name: FUNCTION rb_tag_slug(p_label text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rb_tag_slug(p_label text) TO anon;
GRANT ALL ON FUNCTION public.rb_tag_slug(p_label text) TO authenticated;
GRANT ALL ON FUNCTION public.rb_tag_slug(p_label text) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION sync_wardrobe_items_count(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_wardrobe_items_count() TO anon;
GRANT ALL ON FUNCTION public.sync_wardrobe_items_count() TO authenticated;
GRANT ALL ON FUNCTION public.sync_wardrobe_items_count() TO service_role;


--
-- Name: TABLE avatar_cells; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.avatar_cells TO anon;
GRANT ALL ON TABLE public.avatar_cells TO authenticated;
GRANT ALL ON TABLE public.avatar_cells TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: TABLE feedback; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback TO anon;
GRANT ALL ON TABLE public.feedback TO authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;


--
-- Name: TABLE generation_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.generation_log TO anon;
GRANT ALL ON TABLE public.generation_log TO authenticated;
GRANT ALL ON TABLE public.generation_log TO service_role;


--
-- Name: TABLE look_pieces; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.look_pieces TO anon;
GRANT ALL ON TABLE public.look_pieces TO authenticated;
GRANT ALL ON TABLE public.look_pieces TO service_role;


--
-- Name: TABLE lookbook_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lookbook_items TO anon;
GRANT ALL ON TABLE public.lookbook_items TO authenticated;
GRANT ALL ON TABLE public.lookbook_items TO service_role;


--
-- Name: TABLE looks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.looks TO anon;
GRANT ALL ON TABLE public.looks TO authenticated;
GRANT ALL ON TABLE public.looks TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE planned_days; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.planned_days TO anon;
GRANT ALL ON TABLE public.planned_days TO authenticated;
GRANT ALL ON TABLE public.planned_days TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE prompt_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prompt_history TO anon;
GRANT ALL ON TABLE public.prompt_history TO authenticated;
GRANT ALL ON TABLE public.prompt_history TO service_role;


--
-- Name: TABLE tag_looks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tag_looks TO anon;
GRANT ALL ON TABLE public.tag_looks TO authenticated;
GRANT ALL ON TABLE public.tag_looks TO service_role;


--
-- Name: TABLE tag_pieces; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tag_pieces TO anon;
GRANT ALL ON TABLE public.tag_pieces TO authenticated;
GRANT ALL ON TABLE public.tag_pieces TO service_role;


--
-- Name: TABLE tags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tags TO anon;
GRANT ALL ON TABLE public.tags TO authenticated;
GRANT ALL ON TABLE public.tags TO service_role;


--
-- Name: TABLE wardrobe_inbox; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wardrobe_inbox TO anon;
GRANT ALL ON TABLE public.wardrobe_inbox TO authenticated;
GRANT ALL ON TABLE public.wardrobe_inbox TO service_role;


--
-- Name: TABLE wardrobe_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wardrobe_items TO anon;
GRANT ALL ON TABLE public.wardrobe_items TO authenticated;
GRANT ALL ON TABLE public.wardrobe_items TO service_role;


--
-- Name: TABLE wardrobe_tag_defaults; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wardrobe_tag_defaults TO anon;
GRANT ALL ON TABLE public.wardrobe_tag_defaults TO authenticated;
GRANT ALL ON TABLE public.wardrobe_tag_defaults TO service_role;


--
-- Name: TABLE wardrobe_taxonomy; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wardrobe_taxonomy TO anon;
GRANT ALL ON TABLE public.wardrobe_taxonomy TO authenticated;
GRANT ALL ON TABLE public.wardrobe_taxonomy TO service_role;


--
-- Name: TABLE wear_seed_labels; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wear_seed_labels TO anon;
GRANT ALL ON TABLE public.wear_seed_labels TO authenticated;
GRANT ALL ON TABLE public.wear_seed_labels TO service_role;


--
-- Name: TABLE wears; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wears TO anon;
GRANT ALL ON TABLE public.wears TO authenticated;
GRANT ALL ON TABLE public.wears TO service_role;


--
-- Name: TABLE wishlist_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wishlist_items TO anon;
GRANT ALL ON TABLE public.wishlist_items TO authenticated;
GRANT ALL ON TABLE public.wishlist_items TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


-- Beta's profile row for every new Supabase Auth user (lives on auth.users, outside schema public).
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reference data the migrations seeded (wardrobe_taxonomy, wardrobe_tag_defaults, wear_seed_labels).
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.4


--
-- Data for Name: wardrobe_tag_defaults; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.wardrobe_tag_defaults VALUES ('Tops', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tops', 'T-shirts & tees', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tops', 'Shirts & blouses', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tops', 'Camisoles & sleeveless', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tops', 'Bodysuits', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tops', 'Statement tops', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tops', 'Sweatshirts & hoodies', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Knitwear', NULL, 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Knitwear', 'Jumpers & sweaters', 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Knitwear', 'Cardigans', 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Knitwear', 'Vests & waistcoats', 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Knitwear', 'Knit separates & sets', 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bottoms', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bottoms', 'Trousers', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bottoms', 'Jeans', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bottoms', 'Skirts', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bottoms', 'Shorts', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Dresses & jumpsuits', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Dresses & jumpsuits', 'Day dresses', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Dresses & jumpsuits', 'Occasion & evening', 'year_round', '{evening,occasion}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Dresses & jumpsuits', 'Jumpsuits & playsuits', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Dresses & jumpsuits', 'Co-ord sets', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Outerwear', NULL, 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Outerwear', 'Coats', 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Outerwear', 'Jackets', 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Outerwear', 'Blazers', 'year_round', '{work,everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Outerwear', 'Gilets & waistcoats', 'autumn_winter', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tailoring & suiting', NULL, 'year_round', '{work}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tailoring & suiting', 'Suit separates', 'year_round', '{work}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Tailoring & suiting', 'Full suits', 'year_round', '{work}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Shoes', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Shoes', 'Flats', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Shoes', 'Heels', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Shoes', 'Sandals', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Shoes', 'Boots', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Shoes', 'Trainers', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bags', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bags', 'Everyday bags', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bags', 'Occasion bags', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bags', 'Travel & utility', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Bags', 'Small leather goods', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Accessories', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Accessories', 'Belts', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Accessories', 'Scarves & wraps', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Accessories', 'Hats & headwear', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Accessories', 'Eyewear', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Accessories', 'Gloves & hosiery', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Accessories', 'Other accessories', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Jewellery', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Jewellery', 'Necklaces', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Jewellery', 'Earrings', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Jewellery', 'Bracelets & rings', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Jewellery', 'Watches & pins', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Activewear', NULL, 'year_round', '{active}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Activewear', 'Active tops', 'year_round', '{active}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Activewear', 'Active bottoms', 'year_round', '{active}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Activewear', 'Active layers & sets', 'year_round', '{active}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Activewear', 'Sport-specific', 'year_round', '{active}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Loungewear & sleepwear', NULL, 'year_round', '{lounge}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Loungewear & sleepwear', 'Loungewear', 'year_round', '{lounge}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Loungewear & sleepwear', 'Sleepwear', 'year_round', '{lounge}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Loungewear & sleepwear', 'Slippers', 'year_round', '{lounge}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Underwear & intimates', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Underwear & intimates', 'Bras', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Underwear & intimates', 'Briefs', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Underwear & intimates', 'Shapewear & base layers', 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Swim & beach', NULL, 'spring_summer', '{travel}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Swim & beach', 'Swimwear', 'spring_summer', '{travel}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Swim & beach', 'Cover-ups', 'spring_summer', '{travel}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Dresses', NULL, 'year_round', '{everyday}');
INSERT INTO public.wardrobe_tag_defaults VALUES ('Swimwear', NULL, 'spring_summer', '{travel}');


--
-- Data for Name: wardrobe_taxonomy; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Carrot / tapered trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Pleated trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Flare trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Chinos');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Cargo trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Linen trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Leather trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Joggers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Leggings');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Straight-leg jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Wide-leg jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Bootcut jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Flare jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Skinny jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Mom jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Barrel-leg jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Boyfriend / relaxed jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Jeans', 'Cropped jeans');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Mini skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Midi skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Maxi skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Pencil skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'A-line skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Pleated skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Wrap skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Slip / bias-cut skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Denim skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Leather skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Skirts', 'Tiered skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Shorts', 'Tailored shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Shorts', 'Bermuda shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Shorts', 'Denim shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Shorts', 'Linen shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Shorts', 'Paperbag shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Shorts', 'Cycling shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Shorts', 'Culotte / skort');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Shirt dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Wrap dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Shift dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'T-shirt dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Smock dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Pinafore dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Tunic dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Denim dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Knit dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'Sundress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Day dresses', 'A-line dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Slip dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Bias-cut dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Cocktail dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Evening gown');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Bodycon dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Corset dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Halter-neck dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'One-shoulder dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Off-the-shoulder dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Sequin / embellished dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Occasion & evening', 'Blazer dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Jumpsuits & playsuits', 'Jumpsuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Jumpsuits & playsuits', 'Playsuit / romper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Jumpsuits & playsuits', 'Boilersuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Dresses & jumpsuits', 'Jumpsuits & playsuits', 'Culotte jumpsuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Dresses & jumpsuits', 'Co-ord sets', 'Matching two-piece set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Dresses & jumpsuits', 'Co-ord sets', 'Knit co-ord set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Dresses & jumpsuits', 'Co-ord sets', 'Tailored co-ord set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Wool coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Tailored overcoat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Trench coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Mac / rain coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Puffer coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Quilted coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Faux fur coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Teddy / borg coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Shearling coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Parka');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Duster / longline coat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Coats', 'Cape / poncho');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Leather / biker jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Denim jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Bomber jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Harrington jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Quilted jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Cropped jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Utility / field jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Suede jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Shacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Anorak / rain jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Linen jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Jackets', 'Tweed / boucle jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Blazers', 'Single-breasted blazer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Blazers', 'Double-breasted blazer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Blazers', 'Oversized blazer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Blazers', 'Cropped blazer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Blazers', 'Tuxedo blazer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Blazers', 'Linen blazer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Gilets & waistcoats', 'Puffer gilet');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Gilets & waistcoats', 'Quilted gilet');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Gilets & waistcoats', 'Tailored waistcoat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Outerwear', 'Gilets & waistcoats', 'Faux fur gilet');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Tailoring & suiting', 'Suit separates', 'Suit blazer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Tailoring & suiting', 'Suit separates', 'Suit waistcoat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Tailoring & suiting', 'Suit separates', 'Suit trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Tailoring & suiting', 'Suit separates', 'Suit skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Tailoring & suiting', 'Full suits', 'Trouser suit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Tailoring & suiting', 'Full suits', 'Skirt suit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Tailoring & suiting', 'Full suits', 'Short suit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Mary Jane');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Loafer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Mule');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Slide');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Brogue / derby');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Moccasin / driving shoe');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Pointed flat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Court shoe / pump');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Slingback');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Kitten heel');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Block heel');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Stiletto');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Platform heel');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Wedge');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Heeled mule');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Heels', 'Ankle-strap heel');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Sandals', 'Flat sandal');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Sandals', 'Heeled sandal');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Sandals', 'Gladiator sandal');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Sandals', 'Thong sandal / flip-flop');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Sandals', 'Espadrille');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Sandals', 'Fisherman sandal');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Sandals', 'Slide sandal');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Ankle boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Chelsea boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Knee-high boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Over-the-knee boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Western / cowboy boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Biker boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Combat boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Sock boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Rain boot / wellington');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Boots', 'Snow boot');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Trainers', 'Leather trainer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Trainers', 'Retro runner');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Trainers', 'Court / tennis sneaker');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Trainers', 'Canvas plimsoll');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Trainers', 'Chunky / dad trainer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Trainers', 'Running shoe');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Tote bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Travel & utility', 'Cabin case / suitcase');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Travel & utility', 'Backpack');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Travel & utility', 'Laptop / work bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Travel & utility', 'Beach / straw bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Travel & utility', 'Gym bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Small leather goods', 'Purse / wallet');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Small leather goods', 'Cardholder');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Small leather goods', 'Coin purse');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Small leather goods', 'Pouch');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Small leather goods', 'Passport holder');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Small leather goods', 'Makeup bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Belts', 'Leather belt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Belts', 'Statement buckle belt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Belts', 'Woven belt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Belts', 'Chain belt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Belts', 'Waist / obi belt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Scarves & wraps', 'Silk scarf');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Scarves & wraps', 'Wool scarf');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Scarves & wraps', 'Blanket scarf');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Scarves & wraps', 'Pashmina / wrap');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Scarves & wraps', 'Neckerchief');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Baseball cap');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Bucket hat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Panama / straw hat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Fedora');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Beanie');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Headband');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Hair clip / claw');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Hats & headwear', 'Occasion hat / fascinator');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Eyewear', 'Sunglasses');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Eyewear', 'Optical frames');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Gloves & hosiery', 'Leather gloves');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Gloves & hosiery', 'Wool gloves');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Gloves & hosiery', 'Tights');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Gloves & hosiery', 'Sheer hosiery');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Gloves & hosiery', 'Socks');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Gloves & hosiery', 'Trainer socks');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Gloves & hosiery', 'Knee-high socks');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Other accessories', 'Umbrella');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Other accessories', 'Phone case / tech accessory');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Accessories', 'Other accessories', 'Keyring / bag charm');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Necklaces', 'Fine chain');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Necklaces', 'Pendant necklace');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Necklaces', 'Statement necklace');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Necklaces', 'Choker');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Necklaces', 'Layered set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Necklaces', 'Pearls');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Earrings', 'Studs');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Earrings', 'Hoops');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Earrings', 'Drop earrings');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Earrings', 'Statement earrings');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Earrings', 'Huggies');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Loungewear & sleepwear', 'Slippers', 'Mule slipper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Loungewear & sleepwear', 'Slippers', 'Slipper sock');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Loungewear & sleepwear', 'Slippers', 'Shearling slipper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Bras', 'T-shirt bra');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Bras', 'Balconette bra');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Bras', 'Bralette');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Bras', 'Strapless bra');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Bras', 'Plunge bra');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Briefs', 'Brief');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Briefs', 'Thong');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Briefs', 'High-waist brief');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Briefs', 'Shaping brief');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Shapewear & base layers', 'Shaping bodysuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Shapewear & base layers', 'Slip');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Shapewear & base layers', 'Thermal base layer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Statement tops', 'Cut-out top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Statement tops', 'Embellished / sequin top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Statement tops', 'Kaftan top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Sweatshirts & hoodies', 'Crewneck sweatshirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Sweatshirts & hoodies', 'Hoodie');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Sweatshirts & hoodies', 'Zip-up hoodie');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Sweatshirts & hoodies', 'Half-zip sweatshirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Crew neck jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'V-neck jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Turtleneck / polo neck');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Mock neck jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Cable knit jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Chunky knit jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Fine-gauge / merino jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Cashmere jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Oversized jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Cropped jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Striped jumper');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Short-sleeve knit top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Jumpers & sweaters', 'Knitted polo shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Cardigans', 'Cropped cardigan');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Cardigans', 'Longline cardigan');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Cardigans', 'Chunky cardigan');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Cardigans', 'Fine-knit cardigan');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Cardigans', 'Button-through cardigan');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Knitwear', 'Cardigans', 'Cardigan coat / coatigan');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Vests & waistcoats', 'Knit vest');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Vests & waistcoats', 'Argyle / patterned vest');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Knitwear', 'Vests & waistcoats', 'Sleeveless knit waistcoat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Dresses', 'Knitwear', 'Knit separates & sets', 'Knit dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Knitwear', 'Knit separates & sets', 'Knit co-ord set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Knitwear', 'Knit separates & sets', 'Knitted trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Knitwear', 'Knit separates & sets', 'Knit skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Tailored straight trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Wide-leg trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Palazzo trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Cigarette / slim trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Cropped / ankle trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Culottes');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Bottoms', 'Trousers', 'Paperbag-waist trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Underwear & intimates', 'Shapewear & base layers', 'Camisole slip');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Swimwear', 'Bikini top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Swimwear', 'Bikini bottom');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Swimwear', 'One-piece swimsuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Swimwear', 'Tankini');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Swimwear', 'Swim skirt / shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Cover-ups', 'Kaftan');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Cover-ups', 'Sarong');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Cover-ups', 'Beach shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Cover-ups', 'Beach dress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Swimwear', 'Swim & beach', 'Cover-ups', 'Beach trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'T-shirts & tees', 'Crew neck t-shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'T-shirts & tees', 'V-neck t-shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'T-shirts & tees', 'Scoop neck t-shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'T-shirts & tees', 'Long-sleeve t-shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'T-shirts & tees', 'Breton / striped top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'T-shirts & tees', 'Graphic t-shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'T-shirts & tees', 'Boxy / cropped tee');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Classic button-up shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Oversized shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Silk shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Linen shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Poplin shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Denim shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Western shirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Blouse');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Peasant blouse');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Ruffle / frill blouse');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Sheer blouse');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Wrap top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Peplum top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Shirts & blouses', 'Tunic');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Camisole');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Silk cami');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Tank top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Muscle / boyfriend tank');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Halter top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Tube / bandeau top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Bustier / corset top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Camisoles & sleeveless', 'Shell top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Bodysuits', 'Scoop-neck bodysuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Bodysuits', 'Long-sleeve bodysuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Bodysuits', 'Square-neck bodysuit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Statement tops', 'Crop top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Statement tops', 'Off-the-shoulder top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Tops', 'Statement tops', 'One-shoulder top');
INSERT INTO public.wardrobe_taxonomy VALUES ('Shoes', 'Shoes', 'Flats', 'Ballet flat');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Shoulder bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Crossbody bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Hobo bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Bucket bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Top-handle bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Satchel');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'East-west bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Everyday bags', 'Baguette bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Occasion bags', 'Clutch');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Occasion bags', 'Minaudiere / box bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Occasion bags', 'Chain bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Occasion bags', 'Mini bag');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bags', 'Bags', 'Travel & utility', 'Weekender / duffle');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Earrings', 'Ear cuff');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Bracelets & rings', 'Cuff bracelet');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Bracelets & rings', 'Tennis bracelet');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Bracelets & rings', 'Bangle');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Bracelets & rings', 'Charm bracelet');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Bracelets & rings', 'Stacking ring');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Bracelets & rings', 'Signet ring');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Bracelets & rings', 'Cocktail ring');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Watches & pins', 'Dress watch');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Watches & pins', 'Everyday watch');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Watches & pins', 'Smartwatch');
INSERT INTO public.wardrobe_taxonomy VALUES ('Accessories', 'Jewellery', 'Watches & pins', 'Brooch / pin');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Activewear', 'Active tops', 'Sports bra');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Activewear', 'Active tops', 'Workout tank');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Activewear', 'Active tops', 'Technical tee');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Activewear', 'Active tops', 'Long-sleeve base layer');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Activewear', 'Active tops', 'Running jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Activewear', 'Active bottoms', 'Leggings');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Activewear', 'Active bottoms', 'Cycling shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Activewear', 'Active bottoms', 'Running shorts');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Activewear', 'Active bottoms', 'Track trousers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Activewear', 'Active bottoms', 'Tennis skirt');
INSERT INTO public.wardrobe_taxonomy VALUES ('Outerwear', 'Activewear', 'Active layers & sets', 'Track jacket');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Activewear', 'Active layers & sets', 'Matching active set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Activewear', 'Active layers & sets', 'Gym hoodie');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Activewear', 'Sport-specific', 'Yoga / studio wear');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Activewear', 'Sport-specific', 'Ski wear');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Activewear', 'Sport-specific', 'Hiking layers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Activewear', 'Sport-specific', 'Swim training kit');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Loungewear & sleepwear', 'Loungewear', 'Lounge set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Loungewear & sleepwear', 'Loungewear', 'Robe / dressing gown');
INSERT INTO public.wardrobe_taxonomy VALUES ('Bottoms', 'Loungewear & sleepwear', 'Loungewear', 'Cashmere joggers');
INSERT INTO public.wardrobe_taxonomy VALUES ('Tops', 'Loungewear & sleepwear', 'Loungewear', 'Lounge hoodie');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Loungewear & sleepwear', 'Sleepwear', 'Pyjama set');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Loungewear & sleepwear', 'Sleepwear', 'Nightdress');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Loungewear & sleepwear', 'Sleepwear', 'Slip nightie');
INSERT INTO public.wardrobe_taxonomy VALUES ('Other', 'Loungewear & sleepwear', 'Sleepwear', 'Sleep shirt');


--
-- Data for Name: wear_seed_labels; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.wear_seed_labels VALUES ('everyday', 'Everyday');
INSERT INTO public.wear_seed_labels VALUES ('work', 'Work');
INSERT INTO public.wear_seed_labels VALUES ('evening', 'Evening');
INSERT INTO public.wear_seed_labels VALUES ('occasion', 'Occasion');
INSERT INTO public.wear_seed_labels VALUES ('travel', 'Travel');
INSERT INTO public.wear_seed_labels VALUES ('active', 'Active');
INSERT INTO public.wear_seed_labels VALUES ('lounge', 'Lounge');


--
-- PostgreSQL database dump complete
--

