# Onboarding split — design review against the four-session funnel brief

**Date**: 2026-09-25 · **Design**: `Onboarding_Flow.dc.html` (1a–1e onboarding, 2a first home, 3a–3g style notes) · **Brief**: `docs/four-session-funnel-brief.md` · **Status**: review only, nothing built

The design splits the first run into two things: onboarding becomes name → piece → composing → home (the Style step leaves onboarding), and style notes become a three-chapter sheet opened from a dashed card on first-run home. Below: what conflicts with the brief or the live build, what the brief already settles, and the questions that change what gets built.

## A · What the design supersedes (needs a stated founder call)

1. **Slice 7, Option A is undone.** The brief's open decision 1 was closed on 2026-09-21 as Option A (Style fills the imagery wait). The design removes the Style step from onboarding entirely and moves archetypes + icons into a new surface — closer to Option B, but on a new sheet rather than the model page. Both undo the 1 Sep archetype-first placement. Treat this as the new decision and amend slice 7's status line in the brief.
2. **The archetypes have never steered anything.** `style_dna.style_archetypes` is written by onboarding and read by nothing — not `server.js`, not `style_dna.js`, not the dashboard (grep-verified). Only `style_icons` reaches the prompts (`styleDnaPromptBlock`'s third arg). So the "cost" the brief accepted for Option A (first three ways unsteered by archetypes) was already zero, and the design's tri-state reaction ("Not me / Sometimes / Very me") has no consumer either. Two consequences: moving the chapter costs nothing today, and the chapter should not ship without wiring its answer into the prompt block, or it is a question Robes asks and ignores.
3. **The first-run home loses the prompt.** Design 2a: greeting · "Your first piece is filed." · the styled card · the dashed Style-notes card · dock. No prompt box, no three pills, no next line, no model door, no Inspiration row. The brief's governing rule ("Style me stays the one ink on home") and the 2026-09-18 home cut both assume the prompt is on every home. In the live `zero` posture the prompt lives inside the "Style something" row the design removes.
4. **"See the full looks" stops being the one ink.** It was made THE single filled CTA on 2026-08-18 (W01/O1). The design draws it hairline, and with the prompt gone the screen carries no ink fill at all. Either the card's CTA keeps its ink (one commitment per screen, the standing rule) or the rule is set aside for this posture.
5. **The name screen gains a Back.** 1b shows "← Back" on the name stage; the 2026-09-21 cut removed it because nothing stands behind the name (the splash). Recommend: no Back on 1b, Back on 1c returns to the name.
6. **The name screen goes cream.** Today it is the dark `.dk` screen; the design is cream with the ROBES wordmark and the three-segment rule. This closes the August audit's 1.1 (three dark screens) — only the splash stays dark. No conflict, just a bigger change than the design note implies.

## B · Where the design and the brief agree (no decision needed)

- Splash → name for everyone, name prefilled from the profile (already live).
- The piece is read live on one page with the tag pops and the five-row ledger — the current step already does this; 1c merges the well and the ledger into one screen and adds the filed banner and the CTA appearing only once filed.
- The prefire still fires the moment the piece files (the design's composing screen depends on it).
- Model page unchanged below the header (3f) — this also answers the brief's open decision 6: keep "Two photographs. One model."
- The styled card's "Email me when they're ready" ask (slice 6.3) survives: the composing screen only absorbs the text wait, the card still carries the frame wait.
- Skip discipline: 1c shows "Skip for now" only while empty, which is `syncSkip` today.

## C · Open questions (each changes the build)

**Onboarding**

1. **How long does Composing (1e) hold?** `/api/style` returns all three looks' text at once (5–15s); the frames land one by one over 30–90s. Recommend: hold until the text lands, capped at ~20s, then home — the styled card and its mail ask take the frame wait as today. The three lines then tick with the real titles (`ways[i].title`) as theatre, the ledger-reveal precedent, not with "daytime / evening / weekend", which the ways are not named.
2. **What does "Style it three ways →" do?** The piece is already styling when the CTA appears. Recommend: it opens Composing (the label names what she will watch), never a second `/api/style` call.
3. **"or paste a link from a shop"** — `POST /api/wardrobe/read-url` exists (the dashboard's Paste-a-link door), onboarding has no link step. In scope now (medium: the link step, its five named errors, the http image fetched into the prefire) or cut the line?
4. **"Edit the details"** after filing — onboarding has no editor; the dashboard's `_waOpenEdit` form is the only one. Recommend: cut the link; the piece page's pencil is the editor once she lands.
5. **A skipped piece** lands where? Nothing composes, so 1e does not apply. Recommend: home in today's `zero-lead` posture (the prompt leads) with the dashed Style-notes card beneath it.
6. Keep the two-tap "Skip anyway" confirm on the piece? The design does not show it.

**First-run home (2a)**

7. **Which posture is 2a?** It reads as `zero` (styled card present, no saved look). Does it also govern `zero-lead` (card collapsed or a returning session, no look)? If the rows are gone in both and the prompt is gone with them, a user who taps "Later" on style notes has no way to ask Robes for anything. Recommend: rows and prompt return the moment the styled card collapses (See the full looks tapped, or a return visit) exactly as today's `zero-lead`; the dashed card sits under the prompt until notes begin.
8. **When does the dashed "Next · Style notes" card retire?** On any chapter answered, on all three, or on "Done for now"? Recommend: retire once any chapter holds an answer (an archetype, an icon, or a model) and never reappear; the slice-2 model door (`#rb-model-door`, needs a saved look and no model) then carries chapter 03 on its own.
9. **Two doors to the model** — the dashed card ("Let Robes get to know you") and, once a look exists, the model door band + the next line's `model` rule. Both can render on one home at one saved look with no notes begun. Recommend: the dashed card wins while it stands; the band renders only after it retires.
10. **The 15-piece `_rbSilPrompt` card** ("Style notes · newly available", the one dark surface on home) now contradicts style notes being offered on day one. Retire it, or re-point it at the colour/silhouette photographs specifically?

**Style notes sheet (3a–3g)**

11. **Where does it live?** The design is a sheet from home on mobile; desktop is unspecified ("desktop version of 2a" is a try-next). `/stylenotes` already owns every write these chapters make (`style_icons`, the model). Recommend: build the chapters on `stylenotes.html` (`/stylenotes?begin=1` opens the 3a intro; the dashed card links there), rendered as the bottom sheet at ≤767px and as a page at desktop — no second owner of the same columns.
12. **The tri-state reaction needs a data shape and a consumer.** `style_archetypes` is a flat list. Options: keep the list as "Very me" and add `style_archetypes_soft` for "Sometimes"; or `[{name, weight}]`. And `styleDnaPromptBlock` must read it ("her style sits Minimal and Classic, sometimes Off-duty") or the chapter is inert. Recommend the two-list shape (no migration, jsonb) and one prompt line.
13. **Imagery does not exist.** 3b wants two images per archetype (twenty), 4a wants a portrait or house tile per icon. There are no assets, and portraits of living people (Carolyn Bessette-Kennedy is not; Sofia Coppola, Zoë Kravitz are) and house logos on a consumer product carry likeness and trademark exposure. Recommend: ship the deck with a two-tone editorial tile per archetype (or generated still-lifes, no faces) and the icon grid as serif-monogram tiles; revisit imagery separately.
14. **"Phoebe Philo for Céline · Era · 2008–2017"** — the pool is a flat list of names; there is no era data. Recommend: names only, "Keep 'X' as typed" for free text, as onboarding's typeahead does now.
15. **3g becomes the mobile Taste & budget page** — today that page holds icons, budget tiers, splurge categories and annual spend. If the summary replaces it on mobile, tiers/splurge/spend lose their mobile home until "budget joins as a fourth chapter". Ship the summary beside the existing view, or accept the gap?
16. **"Create a look →" on 3g** — which door? The existing `#mv-build` ("Build a look") writes `rb_model_build` and the dashboard lands on the newest undressed look when a model is filed (slice 2.2), else the prompt. Recommend: same handler, same landing; "Create a look" is the label only.
17. **Chapter 03 chrome**: × / Skip / progress over the model page, whose header today carries weather, the avatar and ‹ Home. On desktop the page keeps its chrome; on mobile the chapter chrome replaces it only while entered from the sheet?

## D · Sizing and what changes under the design

- `onboarding.html`: `STEPS = ['keypiece']`, `renderStyle` + `ARCHETYPES`/`ARCH_SEED`/the icon field leave the file (ported to the chapters), the name stage re-registered cream, 1c's merged page + filed banner + conditional CTA, the new Composing stage that polls `rb_onboard_styled` (already written by the prefire) and hands off. `onboarding_harness` (145/145) rewritten.
- `dashboard-personalize.js`: a `zero`-posture branch in `_rbFtuRows` that renders the dashed card in place of the rows (registered in `_lkHomeSync`, sequenced by `_rbFtueOrder`), the card's retire rule, the model-door precedence. `ftue_harness` zero sections rewritten.
- `stylenotes.html`: the 3a intro, the chapter chrome + three-segment rule, the archetype deck (tap; swipe optional), the icons browse + search page, the 3g summary, `?begin=1`. `stylenotes_model_harness` (248) extended; a new chapters section.
- `server.js` / `style_dna.js`: one prompt line reading the archetype answer (question 12).
- Telemetry to add: `style_notes_opened {from}`, `style_chapter_done {chapter}`, `archetype_reacted {name, verdict}`; `wardrobe_added {source:'onboarding'}` unchanged.
- Brief amendments: slice 7's status line, the "Style step (Option A)" copy-sheet row, open decision 1 and 6.

## E · Recommended defaults, if no answer comes back

A1 accept; A3/A4 keep the prompt off first-run home only while the styled card is the hero, and keep "See the full looks" as the one ink; A5 no Back on the name. C1 text-then-home; C2 opens Composing; C3 cut the link line for now; C4 cut; C5 zero-lead; C6 keep; C7/C8/C9 as recommended; C10 retire `_rbSilPrompt`; C11 on `/stylenotes`; C12 two lists + one prompt line; C13 no faces, tone tiles; C14 names only; C15 summary beside the existing taste view, not replacing it; C16 same handler; C17 chapter chrome on mobile only.
