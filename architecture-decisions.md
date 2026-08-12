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

---

## ADR-002 — Season bands, shared tag namespace, derived-with-override look climate (2026-08-12)

**Status**: **accepted** (founder decision, 2026-08-12) — corrected from the
v2.4 draft against the live codebase, with all five open questions answered
in the same call (recorded in "Answers" below). Supersedes the five-value
season axis on `wardrobe_items` and the four-value climate vocabulary on
looks.

**Session A has shipped as SQL, not yet run**: `supabase/season_tags_audit.sql`
(the gate) and `supabase/season_tags_migration.sql` (migration 17), with
`scripts/season_tags_migration_test.sh` as the harness. Nothing reads the new
schema yet; Session B is not started.

**Provenance.** Written in Claude Chat as "ADR-00X · v2.4", reviewed here
against `beta`. The intent of the draft is preserved wholesale — one
vocabulary, shared namespace, derived-with-override climate, inferred
formality. What changed is that three of its schema premises were wrong
about this codebase, and two of its own sections contradicted each other.
Corrections are marked **[C1]**–**[C11]**; open questions **[Q1]**–**[Q5]**,
all answered below.

### Context

Two season vocabularies exist and they do not reconcile.

On a piece, `wardrobe_items.seasons` is a `text[]` multi-select over
*Spring · Summer · Autumn · Winter · Year-round* (migration 10). On a look,
climate is a four-value single-select — *High Summer · Transitional Warm ·
Transitional Cool · Deep Winter* (`LOOK_TAG_CLIMATES`, server.js). Neither
maps onto the other, so a look's climate cannot be derived from its pieces
without a lossy heuristic — which is precisely what `_rbInheritLookTags`
does today. The styling model receives two loosely-coupled signals for one
concept, and filtering a lookbook by season cannot use wardrobe data.

The same duplication exists in *Wear it for*: pieces use
*Everyday · Work · Evening · Occasion · Travel · Active* (`WA_OCCASIONS`),
looks use *Elevated Everyday · Smart Creative · Boardroom Power ·
Work-to-Dinner · Al Fresco & Travel · Cocktail & Cultural · Formal / Gala*
(`LOOK_TAG_WEAR`). A custom tag created on a look — the raw material of a
capsule — is invisible to pieces, and vice versa.

Three forces push toward a shared vocabulary rather than a smaller feature
set:

1. **Cold-start cataloguing is the primary activation risk.** Multi-select
   across five season chips, repeated over 40–80 pieces, is the heaviest
   per-item decision in the add flow.
2. **Four seasons are a fiction in the target markets.** Dublin and London
   wardrobes are largely year-round with outliers at each pole. Spring and
   autumn are the same wardrobe.
3. **SS / AW is native vocabulary to the Muse ICP.** It reads as fluent
   rather than reductive — unlike "Transitional Warm", which is
   app-invented language.

#### What the draft got wrong about the schema

**[C1] `looks.climate` does not exist.** All four look-tag axes are stored
in ONE flat `looks.tags text[]` (migration 14 created the column; the tag
layer adopted it 2026-08-07 deliberately, to avoid a migration). Structure
is recovered by **disjointness** — `_rbTagsParse` walks the array and files
each string by which vocabulary contains it, with two conventions carrying
the open axes: a custom Vibe is stored prefixed (`vibe:Foo`), and **an
unknown plain string reads as a custom Wear tag**. The draft's migration
("High Summer → spring_summer") therefore describes a column re-type that
has no column to re-type. The real migration is *parse a flat array into
one enum column plus N join rows*, and it must honour both conventions or
every custom tag she has created is silently destroyed.

**[C2] Generated looks are not `looks` rows.** This is the largest hole.
Daily looks, key pieces and travel looks carry their tags in the
`lookbook_items.data` jsonb — `dlData.look_tags`, `tvData.looks[i].look_tags`
— written by Gemini (`LOOK_TAGS_SCHEMA` / `normLookTags`) and edited through
`__rbTagSheet`. They have no row in `looks` and no id a `look_tags(look_id …)`
join table could reference. Today they are the **majority** of tagged looks
in the product. A join-table-only design silently excludes them. See [Q1].

**[C3] The season column is `seasons` (plural, array), and `season`
singular is already taken.** `profiles.season` is the muse's *colour*
season from Style Notes — a twelve-value analysis output (*Soft Autumn*,
*True Winter*). Naming a wardrobe column `season` puts two unrelated
concepts one join apart under one word. The vocabulary keeps the name
`season_band`; the column is **`wardrobe_items.season_band`**.

**[C11] Text + check, not a Postgres enum.** The draft specified
`create type season_band as enum (...)`. There are **zero Postgres enums in
this schema** — every constrained value is `text` with a guarded `check`
(migration 13's pattern), and `style_dna_migration.sql` records avoiding them
on live RLS tables as a deliberate deviation. Decisive here: this ADR
explicitly anticipates adding a fourth band (`transitional`) on evidence, and
`ALTER TYPE ... ADD VALUE` is precisely the operation an enum makes awkward.
Widening a check constraint is a one-line `ALTER`. Same for `season_source`,
`climate_source` and `tags.kind`.

**[C4] `look_tags` is already an identifier in this codebase** — the
generation-schema field, `normLookTags`, `data.look_tags`, the
`look_tags_edited` event. Reusing it as a table name guarantees a confused
handoff. Join tables are **`tag_pieces`** and **`tag_looks`**.

**[C5] Sequencing.** This is **migration 17** and **ADR-002**; the ADR file
is `architecture-decisions.md` at the repo root, not `docs/`. Critically,
§"Tags pre-fill from the taxonomy" keys on L1/L2 — which means it depends
on **migration 15 (`wardrobe_taxonomy`), which has not been run on
Robes_p0**. Migration 16 (`look_pieces.role`) is also outstanding. Pieces
filed before 15 runs carry null `category_l2`, so the pre-fill can only key
on the legacy L1 for them. Do not start Session B until 15 has run.

**[C6] The draft contradicts itself on `source`.** §4 says "any user edit to
a tag set flips every tag on that entity to `user`"; §6 says correction
rates on inferred tags are "a live quality signal on the category mapping
from week one". Both cannot hold — bulk-flipping on any edit means adding
one tag re-stamps the tags she *accepted*, and the accepted/corrected
distinction the signal is made of is gone. `source` is **per-row, written
once at insert, never rewritten**. Removing an inferred tag is the
correction event; leaving it is the acceptance.

---

### Decision

#### 1. One season vocabulary, three values, used by both pieces and looks

Postgres enum `season_band`:

| Value | Display label |
| :---- | :---- |
| `spring_summer` | Spring/Summer |
| `autumn_winter` | Autumn/Winter |
| `year_round` | Year-round |

**`wardrobe_items.season_band`** — single-select. Selecting both bands *is*
year-round, so the multi-select collapses into a three-way pick: one tap
per piece.

**Not-null `default 'year_round'`, with a companion
`wardrobe_items.season_source ('inferred' | 'user')` [Q2 — answered].** The
pre-fill writes a season at import and season is a column, not a tag row, so
without `season_source` a Robes inference and her choice are indistinguishable
and §6's measurement cannot run. See the [Q2] answer for why this reverses
both the draft AND the first recommendation written here.

*The reasoning that was weighed and set aside:* the draft specified not-null;
this section originally argued nullable, because that reverses an explicit
founder call (2026-08-06): the default state is **displayed, never stored** — `WA.submit` strips a lone default
back to null so the DB never holds it, and `_waItemSeasons` reads null as
`['Year-round']` at every consumer. Recommendation: keep nullable and keep
reading null as `year_round`. It costs nothing (the read is already
centralised in one helper), it preserves the null-state convention
`occasions` also follows, and — decisively — it is what makes [C6]'s
correction signal work on season too: null means *she has not told us*,
`year_round` means *she said year-round*. Not-null erases that distinction
on day one of the backfill. — This is right about the problem and wrong about
the fix; `season_source` solves it without overloading null.

**Look climate** — same enum, **stored** on a new
**`looks.climate_band season_band`** column (not computed on read) so the
lookbook can filter and sort on it with an index. Single-select.

Climate survives as a first-class, filterable, refinable property of a
look. What changes is that it now speaks the same three words as the
wardrobe, so a lookbook filtered to *Autumn/Winter* and a wardrobe filtered
to *Autumn/Winter* return coherent sets, and the styling model gets one
signal instead of two.

#### 2. Climate is derived, overridable, and does not get clobbered

**Who sets what.** Two different fields on two different entities; the muse
touches both, never the same one twice.

- **`wardrobe_items.season_band`** — she sets this, on a piece, in the
  piece detail sheet. Pre-filled at import, one tap to correct. The only
  place season is *authored*.
- **`looks.climate_band`** — normally she never touches it. It derives from
  the pieces in the look. The override exists for the case the derivation
  cannot see: a year-round silk slip she knows reads as high summer in this
  particular combination. Edited in the look's Tags sheet, not in Refine.

`looks.climate_source` — enum `derived | user`.

```
deriveLookClimate(pieces):
  bands = distinct(pieces.season_band) excluding year_round and null
  {}                             -> year_round
  { spring_summer }              -> spring_summer
  { autumn_winter }              -> autumn_winter
  { spring_summer, autumn_winter } -> year_round
```

**[C7] Derive from OWNED pieces only, and only above a floor.** The draft's
`deriveLookClimate(items)` assumes every item is a wardrobe row with a
season. On the generated tracks that is routinely false — items resolve to
`wardrobe_match` only when the engine matched one, and below fifteen
catalogued pieces most items are aspirational with no wardrobe row at all.
Running the derivation over a half-unowned look collapses to `year_round`
almost every time, which is worse than the model's own read. Rule: derive
from the pieces that resolve to a wardrobe row; if **fewer than two**
resolve, keep the generator's `look_tags.climate` and still mark
`climate_source = 'derived'`.

**Where it runs [Q3].** The draft says "on look save". There is no
server-side look save — looks are written client-side (`_lkCreate` /
`_lkPatch` → Supabase REST), and generated looks get their climate from
Gemini. Two call sites, both client-side: (a) `_lkCreate` / `_lkPatch`
composition changes, (b) the generated-artifact save path where the
model's `climate` lands. Name both in the brief.

If the muse changes climate in the Tags sheet, set
`climate_source = 'user'` and never re-derive that look again — including
when a constituent piece is re-tagged. Her judgement outranks the
derivation permanently, which is the only behaviour that makes the override
trustworthy.

The derivation is a good default, not a guess to be ratified: the sheet
shows the value pre-selected with no explanatory apology.

#### 3. Vibe becomes an open vocabulary, multi-select

The current seven-value picker (`LOOK_TAG_VIBES`) is a fixed taxonomy
standing in for something inherently open-ended. Retire the fixed list as
the *default surface*.

Vibe tags come from two sources:

- **Extracted from the prompt.** When a look is created from a
  natural-language prompt, Robes lifts the vibe language out of it
  (*"something soft and undone for a long lunch"* → `soft`, `undone`).
  This rides the **existing** generation call — `look_tags.vibe` is already
  in `DAILY_SCHEMA` and both travel look schemas — widened from an enum to
  a short free-text array. **No new endpoint, and no new call.** (The draft
  described "a small, cheap Anthropic call inside the existing
  look-creation edge function" — there is no such edge function; look
  generation is Gemini, in-process in `server.js`. The only Anthropic
  surface in the product is `wardrobe-context`, which is not on this path.)
  Extracted tags write with `source = 'inferred'`.
- **Added by the muse via `+ tag`.** The identical affordance as *Wear it
  for* — same component, same dedupe-by-slug, same create-if-missing, only
  `kind` differs. There is no separate free-text entry for vibe.

Multi-select, no cap. The sheet shows her existing vibe tags plus a
recently-used row rather than a canned grid. This makes vibe unambiguously
her voice — consistent with Travel Edit, where she already defines it
herself.

The seven existing values are not discarded: they seed the shared namespace
as `kind = 'vibe'`, `is_seed = true`, so they remain available. They just
stop presenting as *the* list.

**Gemini constraint, non-negotiable.** Widening `vibe` from enum to free
text removes the enum problem; if any enum on this schema is edited,
**never put an empty string in it** — Gemini rejects empty enum values with
`400 INVALID_ARGUMENT`, which took down every `/api/daily` and travel
generation on 2026-08-10. Express "none" by making the field optional.
Dropping `light` (§7) means editing `LOOK_TAGS_SCHEMA.required`, currently
`['climate','light','wear_for']` — that edit is the whole risk surface.

#### 4. Shared tag namespace across pieces and looks

The structural change that makes the rest hold together. Table names
corrected per [C4]:

```
tags (
  id, user_id,
  kind,        -- enum: 'wear_for' | 'vibe'
  label,       -- display text
  slug,        -- normalised, unique per (user_id, kind)
  is_seed,     -- true for Robes-provided defaults
  created_at
)

tag_pieces (wardrobe_item_id, tag_id, source)  -- source: 'inferred' | 'user'
tag_looks  (look_id, tag_id, source)
```

`source` mirrors `climate_source` and exists because pre-filled tags and
deliberate choices are otherwise indistinguishable in the data. The styling
model must weight them differently — without this, every blazer in every
wardrobe is equally `work` and the signal flattens to noise. Per **[C6]**,
`source` is written once at insert and never bulk-rewritten.

One namespace, two join tables. Consequences:

- A custom *Wear it for* tag created on a look — *School run*, *Gallery
  Sunday*, *Lisbon* — is immediately available on pieces, and vice versa.
  **This is what a capsule is:** a tag with both pieces and looks attached,
  which makes a capsule view a query, not a new entity.
- Custom tag creation (`+ tag`) stays on both surfaces. Load-bearing, not
  an escape hatch.
- Seeds are shared, not forked per surface.

**[C8] The old columns are retired, and the ADR must say so.** Once the
join tables land, `wardrobe_items.occasions` and `looks.tags` have no
readers. Leave them in place for one release (read-only, so a rollback is a
redeploy), then drop in a follow-up migration. Two live writers for one
concept is the divergence this ADR exists to end.

##### The `wear_for` seed list — seven, identical on pieces and looks

| Slug | Label | Note |
| :---- | :---- | :---- |
| `everyday` | Everyday | Highest-volume tag. **Promoted from a displayed-only default to a real seed** — see [Q2] |
| `work` | Work | ICP is defined by a demanding career |
| `evening` | Evening | Dinner, drinks, date night — one tag covers all three |
| `occasion` | Occasion | Weddings, races, christenings, parties |
| `travel` | Travel | Drives the packing prompt |
| `active` | Active | Cleanly separate; nothing else absorbs it |
| `lounge` | Lounge | **New** |

*Cut, deliberately:* **Weekend** (~70% overlap with Everyday) and **Holiday
/ Resort** (~80% overlap with Travel). Both would ship and sit unused.
`+ tag` is the pressure valve for the long tail.

*Why Lounge, precisely:* not because loungewear is homeless —
*Loungewear & sleepwear* is already a sheet L1 and a robe is filterable
today. It is the **cross-category** case that has nowhere to go: cashmere
joggers filed under Bottoms, a silk slip under Dresses, an oversized
cardigan under Knitwear. Lounge is a use tag cutting across categories,
which is exactly what the `wear_for` axis is for. State this in the brief
or someone will build a redundant category filter.

Seven **seeds** is not in tension with the uncapped **selection** decision:
few seeds, unlimited selections, custom tags carrying the tail.

##### Same vocabulary, different semantics

The list is identical and the namespace is shared. The *meaning* is not,
and the brief must say so or matching will misbehave:

- **On a piece, a tag is a capability.** A blazer is `work` *and*
  `everyday` *and* `evening`. Piece tagging is permissive and generous.
- **On a look, a tag is an intent.** This look *is* for work. Look tagging
  is declarative and narrow.

**Therefore: never derive look tags by unioning item tags.** A union gives
every look four or five tags and the axis stops discriminating. Look
`wear_for` pre-fills from, in order of precedence:

1. The creation prompt, if there was one (*"something for the office on
   Thursday"* → `work`)
2. The context it was created in — Travel Edit → `travel`; a calendar day
   chip with an event → that event's tag
3. Failing both, the **intersection** of the constituent pieces' tags,
   capped at two

All three write `source = 'inferred'`.

**The two-tag cap on *Wear it for* is removed** — uncapped on both pieces
and looks. A cap forces a choice between a functional tag (*Work*) and a
capsule tag (*Lisbon*), which is exactly the choice that prevents capsules
forming. Implementation note: the cap is enforced in three places, not one
— `_rbTagsParse`'s `pushWear` (`out.wear.length < 2`), `normLookTags`'s
`.slice(0, 2)`, and the sheet's third-pick-retires-the-oldest rule.

*Display consequence:* an uncapped set can overflow the look card's
metadata line. Truncate to the first three by `created_at` with a `+n`
affordance; the full set shows in the Tags sheet. A display rule, not a
data constraint — nothing is dropped.

#### 5. Formality is inferred, not tagged

*"Black tie wedding in October"* is currently unanswerable: nothing records
how dressed up a piece is, and `occasion` spans a christening and a gala.

The fix is **not** a `formal` chip. Formality is ordinal — casual → smart →
formal → black tie — and splitting an ordinal across two booleans
(`occasion` + `formal`) still cannot separate a cocktail dress from a gown,
while adding a decision to every item.

Instead: **`item_dna.formality`**, one of `casual | smart | formal |
black_tie`. Inferred by Gemini at import in `/api/wardrobe/analyse`,
alongside the extraction already running. Formality is among the most
visually legible attributes there is — considerably more reliable than
inferring *Work* — so this costs nothing and adds no tapping.

Implementation constraints on that endpoint: `ANALYSE_SCHEMA.required` is
**exhaustive** (every property is listed), so `formality` goes in both
`properties` and `required`; the call runs `temperature: 0` +
`thinkingConfig: { thinkingBudget: 0 }` and both must stay; and
`maxOutputTokens` is 700 — one short enum field fits, but re-check after
the taxonomy block, since thinking tokens count inside the budget on
`gemini-2.5-flash` and a truncated response here degrades to
`analysisFailed`. `item_dna` is assembled server-side into
`display` / `structural_dna` / `llm_styling_context` / `ai_generated_notes`;
`formality` is a new top-level sibling, and both degraded response shapes
(`noItemDetected`, `analysisFailed`) must carry the key.

No chip, no tag, no user-facing surface at this stage — it goes to the
styling model only. If beta shows the muse wants to filter on it, promote
it from `item_dna` to a column then, per the rule in
`docs/system-architecture.md` ("if any field inside it ever needs querying
across users, promote it to a column or an index table"). Do not
pre-promote.

#### 6. Tags pre-fill from the taxonomy at import

This does more for perceived simplicity than any chip removal, and the
taxonomy to drive it already exists in `wardrobe_taxonomy.js`.

On import, map sheet L1 (and L2 where it splits) → default `wear_for` tags,
written with `source = 'inferred'`. **[C9] The draft's table covered six of
the fourteen sheet L1s and named "Outerwear → blazer", which is an L2
(`Blazers`) under sheet L1 `Outerwear`.** Full mapping over the live
fourteen:

| Sheet L1 (L2 where it splits) | Default `wear_for` | Default `season_band` |
| :---- | :---- | :---- |
| Tops | `everyday` | `year_round` |
| Knitwear | `everyday` | `autumn_winter` |
| Bottoms | `everyday` | `year_round` |
| Dresses & jumpsuits — *Day dresses*, *Jumpsuits & playsuits* | `everyday` | `year_round` |
| Dresses & jumpsuits — *Occasion & evening* | `evening`, `occasion` | `year_round` |
| Outerwear — *Blazers* | `work`, `everyday` | `year_round` |
| Outerwear — *Coats*, *Jackets*, *Gilets & waistcoats* | `everyday` | `autumn_winter` |
| Tailoring & suiting | `work` | `year_round` |
| Shoes | `everyday` | `year_round` |
| Bags | `everyday` | `year_round` |
| Accessories | `everyday` | `year_round` |
| Jewellery | `everyday` | `year_round` |
| Activewear | `active` | `year_round` |
| Loungewear & sleepwear | `lounge` | `year_round` |
| Underwear & intimates | `everyday` | `year_round` |
| Swim & beach | `travel` | `spring_summer` |

Two notes on that table. Sheet L1 is resolved by `_waSheetCatOf` — L2 wins,
falling back to the legacy L1 map for pre-migration-15 pieces, which carry
no L2 at all and therefore only ever hit the L1 rows. And the season
pre-fills are the only three that are not `year_round`; everything else
defaults to the null-read state, so [Q2]'s nullable column and this table
agree.

The muse taps to **correct**, not to create. Per **[C6]** a correction is
the removal of an inferred tag, and that is the signal: a category whose
inferred tags are removed at a high rate has a bad mapping, measurable from
week one.

#### 7. Light is removed

`light` (*Daylight* / *Twilight & Evening*) is the one axis this ADR deletes
outright. It is near-fully implied by *Wear it for* (`evening`, `occasion` →
twilight) and is not a dimension anyone filters a lookbook on.

Drop the vocabulary, the tag group, the Refine axis and any stored values —
`LOOK_TAG_LIGHTS`, `LOOK_TAGS_SCHEMA.light` (and its entry in `required`),
`normLookTags.light`, `_RB_TAG_AXES.light`, the `_rbTagsRowHtml` twilight
chip and `_lkRefine.light`. Do not retain it as derived metadata — a field
nothing reads is a field that will drift.

#### 8. Resulting look Tags sheet

- **Climate** — single-select, three chips, pre-selected from derivation
- **Wear it for** — multi-select, uncapped, seeds + her tags, `+ tag`
- **Vibe** — multi-select, uncapped, her tags + recently used, `+ tag`

*Wear it for* and *Vibe* are **one component rendered twice**, differing
only in `kind` and in what seeds the list. Same chip, same `+ tag`, same
create-and-dedupe path. Build it once; a second entry pattern for vibe
would be a second thing to maintain and a second thing for the muse to
learn. (`__rbTagSheet` is already one shared modal across every surface —
this is a change inside it, not a new component.)

The apologetic subhead (*"Robes filled these from the look — tap any to
change"*) goes — the values are defaults, not guesses awaiting approval.

**Naming: `Refine` is not available for this sheet.** It already denotes
the lookbook filter, and separately the wardrobe filter drawer.

| Surface | Verb | Touches | Writes |
| :---- | :---- | :---- | :---- |
| **Refine** (lookbook) | filter | many looks | nothing — read-only |
| **Refine** (wardrobe) | filter | many pieces | nothing — read-only |
| **Tags sheet** (a look) | edit | one look | `looks.climate_band`, `tag_looks` |
| **Piece detail** (a piece) | edit | one piece | `wardrobe_items.season_band`, `tag_pieces` |

Anywhere the draft said "Refine sheet" for an editing action, read "Tags
sheet".

**[C10] Lookbook Refine currently hides every generated artifact.** In
`_lkPaint`, the stream concatenates `refN ? [] : shelfItems…` — the moment
any filter is active, daily looks, key pieces and travel edits drop out of
the grid entirely and only `looks` rows remain. So "climate is a filter
axis the muse uses to refine her lookbook" is aspirational today, not
current behaviour. Fixing it is cheap and belongs with [Q1]: the client
already holds every lookbook row in cache, so `_lkMatchRefine` gains a
branch that reads the artifact's blob tags instead of dropping the item.

---

### Answers (founder call, 2026-08-12)

All five resolved. The questions are kept with their answers because the
reasoning is what a later session needs, not the verdict alone.

**[Q1] How do generated looks join the namespace?** ([C2] — the blocker.)
**ANSWERED: option (a).** Three options were considered:

- **(a) Blob keeps the tags, namespace supplies the vocabulary.**
  `data.look_tags` stays where it is; climate becomes a `season_band` value
  and `wear_for`/`vibe` become tag *slugs* from the shared namespace. When
  an artifact is promoted to a Look, the slugs resolve into `tag_looks`.
  Refine reads the blob in memory (fixes [C10] at the same time).
  *Recommended* — it matches the existing rule that
  `lookbook_items.data` is the render-authoritative document, adds no
  tables, and is the only option that ships in the two sessions the draft
  scopes.
- **(b) Mint a `looks` row for every generated artifact.** Cleanest model,
  but it changes what a Look *is* — today a Look is something she saved or
  wore, and the Lookbook already distinguishes the two card families. Large
  blast radius across `_pdTier`, accrual and the promotion gate.
- **(c) An index table** (`look_tag_index`), the `planned_days` precedent —
  correct if cross-artifact tag querying ever needs to run server-side.
  Premature now.

**The rule (a) needs, which the draft did not state:** typing a custom tag on
a generated artifact **creates the `tags` row immediately**, even though the
link stays a slug in the blob rather than a `tag_looks` row. Without it,
"Lisbon" typed on a daily look never reaches the namespace, and the capsule —
the entire point of sharing the namespace — never forms. The `tags` row is the
vocabulary; the join row is only the attachment.

The deciding argument against (b) is what it does to what a Look *means*. A
Look today is something she wore or built — accrual on a confirmed wear, the
composer, or an explicit promotion. A generated daily look is a proposal.
Minting a row for each would put un-worn suggestions into the Looks count, the
cost-per-wear maths, and `_pdTier`, where `look` outranks `daily` — so every
generated look would silently jump the precedence order on the home rail.

**[Q2] Nullable `season_band`, or not-null default `year_round`?**
**ANSWERED: not-null `default 'year_round'`, PLUS a new
`wardrobe_items.season_source ('inferred' | 'user')`** — which reverses the
recommendation first written here, for a reason that only appears once §6 is
taken seriously.

The pre-fill writes a season at import, but season is a column, not a tag row,
so it has nowhere to record whether a value is Robes' inference or her choice.
Using null to carry that breaks immediately: three of the pre-fills are
non-null (Knitwear and Outerwear coats → `autumn_winter`, Swim & beach →
`spring_summer`). `season_source` carries it properly, mirrors `climate_source`
on looks, and makes the correction signal work identically on both axes. With
it present, not-null is simply the simpler column.

This does reverse the 2026-08-06 displayed-never-stored call, defensibly: that
call was about a five-value axis where storing "Year-round" was noise. In a
three-value vocabulary `year_round` is the honest answer for most of the
wardrobe, and `season_source` preserves the information the original call was
protecting. The same answer settles the wear axis: `everyday` becomes a real
stored seed rather than a displayed default.

*Superseded reasoning, kept for the record:* **nullable**, preserving the 2026-08-06
displayed-not-stored call and keeping "untagged" distinguishable from
"she said year-round". Note this also decides whether `everyday` is a real
stored seed or stays a displayed default on the wear axis — the two should
answer the same way.

**[Q3] Where does `deriveLookClimate` run?** **ANSWERED: client-side, both
call sites, no server hook.** There is no server-side look save to hang it on,
the derivation is about ten lines of set logic, and the client already holds
`_waItems` in memory — a server version would have to re-fetch the pieces to
do less.

**[Q4] Does the audit gate pass?** **ANSWERED: run it, with the threshold
pre-committed at >25% cross-band pairings, before migration 17.** Shipped as
`supabase/season_tags_audit.sql`, which prints the verdict itself and refuses
to render a number under n=40 as anything but indicative. The honest position:
the collapse is justified by the product argument largely independent of the
count, and the count's job is to catch a surprise — which is exactly why the
threshold is written into the file rather than decided after reading the
result. The draft's own instruction, kept:
before writing anything, count pieces carrying a single-season tag that
lands cleanly in a band versus cross-band pairings. If cross-band pairings
are rare (expected), the collapse is near-lossless. If common, the
four-season axis was carrying real information and this ADR needs
revisiting before merge. On current beta volumes this may be a handful of
rows — if the sample is too small to be evidence, say so and decide on
judgement rather than dressing it up as data.

**[Q5] Migration 15 first.** **ANSWERED: run 15 and 16 now, ahead of
everything.** Both are written, both have been shipping behind degrade paths
for weeks, and 17's pre-fill cannot key on L2 until 15 exists on Robes_p0.
Query 6 of the audit script reports whether it has run.

---

### Migration (17)

`wardrobe_items.season_band` — from `seasons text[]`:

| Existing `seasons` | Maps to |
| :---- | :---- |
| Spring *and/or* Summer only | `spring_summer` |
| Autumn *and/or* Winter only | `autumn_winter` |
| Any cross-band pairing | `year_round` |
| `{'Year-round'}` | `year_round` |
| Null / empty | **null** (reads as `year_round`) — per [Q2] |

`looks.climate_band` — **parsed out of `looks.tags text[]`**, not from a
column ([C1]). The backfill must reuse the disjointness logic, in this
order per element: known climate value → known light value (discard) →
known wear value → known vibe value → `vibe:`-prefixed custom → **otherwise
a custom wear tag**. Climate then maps:

| Legacy climate value | Maps to |
| :---- | :---- |
| High Summer | `spring_summer` |
| Transitional Warm | `spring_summer` |
| Transitional Cool | `autumn_winter` |
| Deep Winter | `autumn_winter` |

All migrated looks get `climate_source = 'derived'`, so the first save after
migration re-derives from pieces and self-corrects.

**Legacy look-level *Wear it for* values** do not survive as seeds — they
were a parallel vocabulary, which is the problem this ADR exists to fix.
Map onto the shared seven, `source = 'inferred'`:

| Legacy look value | Maps to |
| :---- | :---- |
| Elevated Everyday | `everyday` |
| Smart Creative | `work` |
| Boardroom Power | `work` |
| Work-to-Dinner | `work`, `evening` |
| Al Fresco & Travel | `travel` |
| Cocktail & Cultural | `evening` |
| Formal / Gala | `occasion` (formality carried by `item_dna.formality`) |

`wardrobe_items.occasions text[]` migrates element-wise into `tag_pieces`:
the five known values (`Work`, `Evening`, `Occasion`, `Travel`, `Active`)
map to their slugs; a stored `Everyday` folds to `everyday`; **anything else
is a custom tag she typed** and must be created in `tags` with
`is_seed = false`, not dropped.

Existing **Vibe** values migrate into `tags` as `kind = 'vibe'`,
`is_seed = true`, deduplicated per user by slug. Custom vibes arrive
`vibe:`-prefixed and must have the prefix stripped before slugging. Unlike
`wear_for`, the seven survive intact — vibe is an open vocabulary and they
are legitimate members of it.

**Not covered by the draft, and required:** `light` values in `looks.tags`
are discarded (§7), and the `seasons` / `occasions` / `tags` source columns
stay in place read-only for one release before a follow-up drop ([C8]).

---

### Consequences

**Gained**

- One vocabulary across piece and look for both season and tags. Lookbook
  and wardrobe filtering return coherent sets.
- Five chips and a multi-select down to three chips and one tap in the
  add-a-piece flow — the heaviest per-item decision in cataloguing.
- Capsules become a query over a shared tag, not a new model tier.
- Vibe becomes consistently the muse's voice across looks and Travel Edit.
- Removes the last surface where Robes asks her to ratify a guess.
- Tagging becomes correction rather than authoring, using only the taxonomy
  already in place.
- Formality becomes answerable at zero tagging cost.
- Correction rates on inferred tags become a live quality signal on the
  category mapping from week one — but only with [C6]'s per-row `source`.

**Lost — accepted knowingly**

- Look climate loses two levels of granularity (four values to three).
  Mitigation: Daily Look already weights candidates by live weather, a finer
  instrument than any season tag. Do **not** pre-build a fourth band. If
  beta shows muses fighting the taxonomy, add `transitional` then, with
  evidence.
- The genuinely shoulder-season piece (the light trench: wrong in July,
  wrong in January) sits in `year_round`.
- `light` as an axis entirely — removed, not derived.
- The legacy look-level *Wear it for* vocabulary, which was more editorial
  than the shared seven. Register is recoverable in display copy; a forked
  vocabulary is not recoverable at all.
- Formality is invisible to the muse at this stage — she cannot filter on
  it, only prompt against it.
- Any query on the four-season or four-climate axes breaks and must be
  updated. The known consumers are `_waSeasonNow` / `_waInSeasonNow` /
  `_waItemSeasons` (Hero Rack in-season sort and wardrobe Refine),
  `heroMark` (which prints each hero's seasons into the closet block of
  every generation prompt), `_rbInheritLookTags`, `_lkTagsOf` /
  `_lkRefine`, and `LOOK_TAG_*` / `normLookTags` / `LOOK_TAGS_RULE` on the
  server. **The Hero Rack is not mentioned in the draft and is a live
  consumer**: `_waSeasonNow` maps month → one of the four seasons and must
  become month → band.

---

### Scope guardrail for the Claude Code brief

Covers: the `season_band` vocabulary (text + check, [C11]),
`wardrobe_items.season_band` + `season_source`,
`looks.climate_band` + `climate_source`, the `tags` / `tag_pieces` /
`tag_looks` schema including per-row `source`, all backfills (including the
flat-`looks.tags` parse), `deriveLookClimate` with the owned-pieces floor,
the override rule, the category → tag pre-fill mapping, and
`item_dna.formality` in the Gemini extraction prompt.

Does **not** cover: the Tags sheet layout, the vibe entry interaction, or
the capsule view. Those are Claude Design briefs, sequenced after this
lands.

**Sequence in two sessions, not one.** Session A: schema and migrations,
revertible on their own. Session B: pre-fill mapping, formality inference,
prompt-to-vibe extraction. Session B depends on A, and on migration 15
([Q5]); A must be independently revertible — if the season collapse proves
wrong at the audit gate ([Q4]), nothing else should have to unwind with it.

### What writing Session A actually found

The migration was tested against a throwaway Postgres 16 with a fixture
covering every backfill branch (`scripts/season_tags_migration_test.sh`,
48 assertions). Two bugs existed in the first draft of the SQL and neither
was visible by reading it:

1. **A data-modifying CTE cannot see its own inserts.** The natural shape —
   `with ins_tags as (insert into tags ... returning ...) insert into
   tag_pieces select ... join tags` — runs both against the same snapshot, so
   the join matched only pre-existing rows. It produced **0 tag_pieces links**
   and silently lost every piece tag, while `tag_looks` half-worked by
   accident from slugs an earlier statement had already committed. The
   backfills are deliberately split into separate statements over a temp
   table; the file says so, because it reads like something to tidy up.
2. **`to_regproc('public.is_admin()')` always returns NULL.** `to_regproc`
   takes a bare name and rejects an argument list, so the guard around the
   admin-read policies reported the function missing on a database that had
   it, and skipped all three policies. `to_regprocedure` is the correct
   function.

A third issue was design, not a crash: `rb_tag_slug` originally left
diacritics to the non-alphanumeric rule, so `Old Céline Minimal` — a shipped
vibe seed — slugged to `old-c-line-minimal`, while any ordinary JS slugify
produces `old-celine-minimal`. The two would never dedupe. The function now
transliterates, and the JS contract is written into the migration header.
**Session B must implement the client slugify to match it exactly.**

**Harnesses to re-run on both sessions**, since all four touch the surfaces
this changes: `addflow_harness` (102), `looks_harness` (201),
`ftue_harness` (139), `travel_console_smoke` (101).
