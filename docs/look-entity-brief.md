# Look as a saved entity — architecture brief

**Date:** 30 July 2026
**Status:** Sequenced **ahead of** the Travel Edit restructure. Travel A2/B2 depends on this landing first.
**Audiences:** Section A → Claude Design · Section B → Fable · Section C → Annie

---

## 1. Why this comes first

Wardrobe is a catalogue of pieces. There is currently no catalogue of *looks* — a generated outfit is a position inside a plan blob, with no identity, no persistence, and no way to wear it again.

Three consequences, in order of strategic weight:

**The Style Graph cannot compound.** Items teach the system almost nothing about taste. Combinations are the signal. Every saved Look is a labelled positive example. This is known gap #4 — intelligence not reading as cumulative — and this is its fix.

**"Wear more, buy less" is currently unfalsifiable inside the product.** Looks plus wear events give cost-per-wear, most-worn, and never-worn. The core thesis becomes measurable for the first time.

**Travel's plans-first model has nothing to pin.** Clodagh's *"pin the outfit to the day"* presupposes looks are addressable objects. They aren't yet.

---

## 2. The object model — resolved

Three objects, not one. The question "does changing the shoes create a new look?" dissolves once the *thing* is separated from *the occasion it was worn*.

| Object | What it is | Mutable? |
|---|---|---|
| `Look` | The saved, named, reusable entity. Lives in Wardrobe → Looks. | Yes — small edits keep its identity |
| `Wear` | An immutable record: this look, these exact pieces, this date. | **Never.** History is frozen |
| `DayCard` | The surface rendering of a wear or a proposed look on a planning surface | n/a — presentation |

**Worked example.** Look 01 pinned to 1 Aug creates `Wear A` {Look 01, pieces a·b·c·d, 1 Aug}. Pinned to 10 Aug with the shoes swapped creates `Wear B` {Look 01, pieces a·b·c·e, 10 Aug}. Look 01 remains one look, worn twice.

**Why not pure immutability (every change mints Look 02):** Swap is a core mechanic. Version explosion within weeks, reproducing known gap #5 at the entity level, and it destroys the insight that matters most — "the Thursday one, worn 11 times" is one look she reaches for constantly, not three looks differing by footwear.

**Why not pure mutation:** editing a look pinned to five days silently rewrites five days of history.

**Promotion rule:** a variant becomes its own Look **only by explicit user action** ("Save as a new look"). Robes does not infer that a changed piece constitutes a new outfit — only she knows whether that was a variation or a new thing. Same principle as offered-not-applied titles.

---

## 3. Sequencing — phase 3 is the exciting one and it goes last

**Phase 1 · The entity, accruing passively** — highest value, lowest cost, no new vision work.
Looks tab, Look detail, `LookTile` extraction, and confirmed wears. A look becomes saved when she confirms wearing it. Her catalogue builds itself from behaviour she already exhibits.

**Phase 2 · Manual build and piece-matching** — the engagement layer.
She composes looks from catalogued pieces, or by uploading a photo and connects look to pieces through a tactile interaction.

**Phase 3 · Photo capture and garment extraction** — last.
Genuinely hard vision problem, made harder by our own data: wardrobe photos are flat-lays, and matching a worn, folded, partially-occluded garment to a flat-lay is a different task from extracting it. Must not gate phases 1 and 2. Can be a future build after beta

---

## Section A — Design decisions (Claude Design)

### A1 · Wardrobe gains two tabs — `Pieces` | `Looks` — **Phase 1**
No nav change. Nav stays Wardrobe / Lookbook. Looks is a tab inside Wardrobe, not a destination.
Vocabulary is already in the product — the Travel Edit says *10 pieces · 7 looks* — so this needs no new language.
Looks grid carries per-card metadata: piece count, wear count, last worn. Filters include **Never worn** — this is the wear-more-buy-less surface.

### A2 · `LookTile` is the shared primitive — **Phase 1, structural**
A `DayCard` is a look rendering wrapped in day context. Extract the inner rendering as `LookTile`:
- `LookTile` — image, title, pieces, actions
- `DayCard` — `LookTile` + date, weather, occasion, evening line

The Looks tab uses `LookTile` alone. **Do not build a parallel Look card component.** Two components rendering the same content on different surfaces is precisely the failure that produced the `planned_days` divergence. See B2 for the engineering cost.

### A3 · Look detail — the four actions are load-bearing
`Wear it today` · `Pin to a day` · `Pack it` · `Restyle`.
Without these, the Looks tab is a gallery. With them, Looks becomes the connective tissue between Daily, Weekly and Travel. `Pin to a day` is the mechanic Clodagh asked for.

### A4 · Wear confirmation — **Phase 1**
Wears are user-confirmed, not inferred. Tapping *Wear it today* is intent, not evidence.
Beta default: the tap creates the wear, with easy undo on the day. Design the undo as a quiet affordance on the day's card, not a toast.
*Placement gated — see C1.*

### A5 · Variant promotion
When she edits a look that has wear history, offer `Save as a new look` alongside `Update this look`. Never silent. Never inferred.

### A6 · Titles are offered, not applied
Carries the rule from the Travel brief (A10): suggestion pre-populates, renders as provisional, becomes the title if untouched. No null state — a Look cannot be unnamed without breaking the grid.

### A7 · Piece-matching is **tactile, not gamified** — **Phase 2**
Annie's instinct is right that user involvement is an asset at this stage, not friction — it is also what Clodagh asked for directly ("the user should be more involved").

**Brand caution:** *gamified* is a dangerous word here. Points, badges, streaks, progress bars and confetti are a register clash with Jacquemus-meets-Bottega, and are the standard way premium products come to feel cheap.

What to build instead: drag-and-snap, a satisfying settle when a piece connects, the picture completing. The reward is that the next connection is easier and the styling visibly better — **not a score**. Frame the interaction as *teaching Robes her wardrobe*, never as *completing your profile*.

### A8 · Capture and deconstruct — **Phase 3**
Photo → identify garments → **match against existing wardrobe first** → confirm → save.
Creation of new wardrobe items is the fallback path, never the default, and always explicitly confirmed. See B6.

---

## Section B — Engineering decisions (Fable)

### B1 · Three tables
`looks` (id, user_id, name, name_provisional, tags, created_at)
`look_pieces` (look_id, wardrobe_item_id) — the current composition
`wears` (id, look_id, user_id, date, piece_ids **snapshotted**, confirmed_at)

`wears.piece_ids` is a snapshot, not a join to current composition. This is what keeps history truthful when the look is later edited.

### B2 · `LookTile` extraction — **accepted, with cost acknowledged**
`DayCard` is refactored to compose `LookTile` rather than own the look rendering. Nothing changes visually. The seven invariant slots and the state model survive intact.

**Cost, stated plainly:** this reopens a component that was recently declared finished, and four working surfaces get rebuilt underneath. Real time, real regression risk.

**Why it is accepted:** the alternative is two components drawing the same thing, drifting apart over time — the `planned_days` failure in a different costume. It is cheapest to do this *now*, before the Looks tab exists. Once a separate Look card ships and is in use, unification becomes a materially larger job.

Sequence B2 before A1 ships, not after.

### B3 · Passive accrual
On confirmed wear of any generated look, create the `Look` if it does not exist, then create the `Wear`. No separate "save" step, no modal. The catalogue grows from behaviour.

### B4 · Wears are immutable
No update path. Corrections are delete-and-recreate. This is a hard constraint, not a default.

### B5 · No auto-promotion
Editing `look_pieces` mutates the existing Look. Creating a new Look is only ever an explicit user action (A5). There is no similarity threshold, no inference.

### B6 · Match-first extraction — **Phase 3, defensive**
Known gap #5 is near-duplicate entries. Extraction that mints wardrobe items will make this dramatically worse. Matching against existing items is the default path; creation is the fallback; both require confirmation. If one flow in this programme is built defensively, it is this one.

**Stack note:** styling text is Anthropic, imagery and vision are Gemini. Both live. Verify before briefing any Claude Code pass — stale single-LLM context has caused reasoning errors before.

---

## Section C — Gated on Annie

| # | Decision | Recommendation |
|---|---|---|
| **C1** | Where does wear confirmation happen — undo-on-tap, or a light prompt on yesterday's card next session? | Start with undo-on-tap. Watch whether the counts feel true to her; add the retrospective touch only if they don't. |
| **C2** | What triggers dropping confirmation in favour of inference? | Write the trigger down now so "during beta" doesn't become permanent by default. Natural candidate: a high proportion of pinned looks getting confirmed. |
| **C3** | Final naming — `Looks` or `Outfits`? | **Looks.** Already in the product's vocabulary and more editorial. `Outfits` is the more common consumer word — worth one line of user checking. |
| **C4** | Can a Look be saved if a piece isn't catalogued? | No. Looks should *pull* cataloguing — the peak goodwill moment — rather than route around it. But confirm this doesn't create a dead end in Phase 3 capture. |

---

## Section D — Resolved, recorded

- **Wears are user-confirmed during beta.** Rationale beyond hygiene: a confirmed wear count is defensible evidence. If wear-more-buy-less appears in an Enterprise Ireland application or an investor conversation, inferred numbers will not survive a sharp question.
- **`LookTile` extraction: the tidy way.** Accepted 30 Jul.
- **Photo extraction goes last.** Accepted 30 Jul.

---

## Section E — Out of scope

- Travel Edit restructure — blocked on this, briefed separately
- Weekly Planner — unchanged, day-indexed
- New nav destinations
- Wardrobe cataloguing flow itself — protected
- Outfit sharing artifact — later phase
