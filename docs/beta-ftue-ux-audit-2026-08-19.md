# Beta FTUE UX audit — first session, end to end (2026-08-19)

**Method.** Stepped through the live beta build (branch `beta` code, booted via the harness stubs with
realistic generation fixtures) as a first-time user, at 1280px and 390px: onboarding → first dashboard
landing → cataloguing → first look → prompt-generated look → swap (incl. Snap mine) → the week ahead →
the Travel Edit. ~40 screenshots captured at every journey beat; findings verified against the code
where behaviour was ambiguous. Purpose: feed the User Testing Guides.

**Severity key.** 🔴 will distort a first session / burn trust · 🟠 real friction, worth fixing before
testing · 🟡 polish or copy · ⚪ observation / watch-in-testing.

---

## What already works (don't touch these in a pre-testing panic)

- **Onboarding is genuinely short and the reveal is the wow.** Two working steps, skip discipline
  correct in every direction, the scan → tag-pop → ledger fill is the best 20 seconds of the product.
  Straight-to-dashboard with the styled card waiting is a strong handoff — no dead "done" screen.
- **One goal per screen holds on first landing.** The styled card carries the single filled CTA; the
  three hairline rows read as quiet doors, not competing asks.
- **The kp guide band** ("START HERE … Build a look ↓") is a textbook non-gating nudge.
- **The daily console's commitment model is clear** — "This day is dressed. Keep the look and it joins
  your Lookbook" is the best articulation of the day-vs-look split yet.
- **The swap modal's Robes' suggestion block** (you don't own this category, but your X creates a
  similar outline → USE THIS INSTEAD) is a highlight — it teaches the product's whole value in one card.
- **The travel unfurl** is the strongest prompt moment in the app: "A trip to Lahinch, 4 days — here's
  the shape of it." with editable Where/When/Vibe crumbs and "read from your prompt" provenance.
- **Design cohesion** — the R1 headers, one card language, black-fill discipline — reads as one product.

---

## Findings by journey stage

### 1 · Onboarding

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 1.1 | 🟡 | **Three dark screens before any value.** Splash (2s) → intro → name is three taps of ceremony; the name is already known from signup and only prefilled on the name screen. | Fold the name confirmation into the intro screen ("You're Annie, right?") or skip it when `first_name` exists. Saves one screen from the coldest part of the funnel. |
| 1.2 | 🟡 | **The intro promises "Robes builds your style notes"** but the flow that follows asks for icons + one piece, and Style Notes is actually a separate post-onboarding surface. Testers who remember the promise will go looking for "style notes" and find a dashboard. | Either re-word the intro to the actual payoff ("Robes styles your first piece three ways") or keep "style notes" as the umbrella and make the done-handoff echo it. |
| 1.3 | ⚪ | Step 01 (icons) is excellent — inline chips, skip withdrawing on answer, ten-strong pool. Watch whether testers understand a *brand* is valid (the pool mixes people and brands without labels). | None yet; note for the testing guide script. |
| 1.4 | ⚪ | Step 02's "What Robes files" ledger sets up the reveal well. The CUT row stays "Reading" until analysis lands — on a piece where the model returns no silhouette it reads as stuck. | Fall back to "—" after the other rows land. |

### 2 · First dashboard landing (the styled card + kp result)

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 2.1 | 🟠 | **The guide band and per-look copy overpromise at one piece.** "Pick one of the three looks below and build it from your wardrobe" — she owns one piece. Tapping *Build this look* itemises a rack that is mostly shop proposals ("N to find"). The first concrete act after the wow is, visually, a shopping list. | Soften the band to ownership-honest copy ("build it around what's yours — Robes borrows the rest") and make the loose console's "N of M from your wardrobe" line do the explaining. This is the single most likely "wait, do I have to buy all this?" moment in testing. |
| 2.2 | 🟠 | **Unowned pieces in the kp-built loose look render as permanently blank tiles.** `__kpBuildLook` posts `/api/daily` with `noImages: true`, so no still-life job ever starts — the board shows an empty beige placeholder in the composition, forever, at the exact moment the product is showing off. | Render the monogram/label tile (the pattern already exists for shop pieces on rails) instead of the bare placeholder whenever no image job is possible. |
| 2.3 | 🟡 | The styled card's three tiles + "See the full looks →" all route to the same place — good. The footer line "Every look borrows the rest until you photograph your own" is the honest cold-start line and belongs in the testing-guide vocabulary. | Keep. |
| 2.4 | ⚪ | The card collapses permanently on interaction; the result survives in the Lookbook row. Verify testers can re-find it (the Inspiration tab holds key pieces — one more hop than they'll expect). | Watch in testing: "find your styled piece again" as a task. |

### 3 · Cataloguing (the add flow)

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 3.1 | 🟠 | **No payoff moment between piece 2 and piece 14.** The post-add fork (`__rbAddFork`) is code-gated to fire only at ≥15 pieces (deliberate — "below 15 she is cataloguing, not styling"), so every early add ends with just a toast. Right call on the *modal*, but the early adds are exactly where motivation dies, and currently nothing tells her what each piece just unlocked. | A one-line, non-modal payoff in the toast or the learning meter — "Filed. Today's look is now 3 pieces yours." — keeps the loop warm without taxing the batch. **Also: CLAUDE.md still describes the fork as firing after *every* add — update the doc.** |
| 3.2 | 🟡 | **"From a link · Paste a product page" is a dead coming-soon door inside the FTU add modal.** First-session modals should not contain disabled futures; every tap on it costs trust. | Hide it until live (it can return behind the + menu for engaged users). |
| 3.3 | ⚪ | The batch-add promise ("Select several and Robes files them one after another") is the single biggest cold-start lever and it's one quiet line in the dropzone. | In the testing guide, explicitly test whether users discover multi-select unprompted. |

### 4 · First look (home rack + Lookbook composer)

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 4.1 | 🟠 | **The composer leads with formula jargon.** THE CANVAS / THE ANCHOR / THE TEXTURE / THE EXCLAMATION POINT head the four slots, with serif-italic role poetry beneath ("Elevated basics balancing proportion and tone"). The daily rack deliberately dropped this jargon (optimization 4.7); the composer — a *first-session* surface via BUILD YOUR OWN — reintroduces it with no translation. | Keep the strips (they're the education layer) but give each a plain-word aside: "The Canvas · tops & basics", "The Anchor · the hero piece". Watch comprehension in testing before deeper changes. |
| 4.2 | 🟡 | Save gated on two pieces + a name is right, and "Or let Robes build the first one" is the correct escape hatch. The disabled SAVE THIS LOOK with no visible reason at zero pieces relies on the title tooltip, which touch users never see. | Surface the "Add two pieces and this look is yours to keep" line as visible microcopy when disabled, not a `title` attribute. |
| 4.3 | ⚪ | The BUILD YOUR OWN row unfurls the full composer in place — verified working; my first automated pass missed the head button, a reminder the whole row is *not* the tap target. | Consider making the entire `.rb-ftu-row` clickable (min 44px is already there; the head button is the only handler). |

### 5 · Prompt → Robes-generated look (the daily console)

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 5.1 | 🟡 | **The masthead stacks three meta lines** — "Wearing *A Dublin dinner look*" + vibe chip + "Robes read **Undone** as the vibe. Not quite? Change the vibe". The transparency is right; three stacked systems above the fold is heavy for a first exposure. | Fold the vibe-read sentence into the chip (tap chip → change), keep the sentence only the first time a vibe is ever read. |
| 5.2 | 🟡 | The rack's flick cluster (arrows + dots + "1/2") on owned pieces reads as an *image* carousel at first glance, not "cycle through your other tops". | A first-use hint ("← your other tops") or count label "1 of 2 tops". Watch in testing before building. |
| 5.3 | ⚪ | The save-offer band is clear, but the day/look split is subtle: a tester who generates and leaves without saving has a *day* in the Diary and nothing in the Lookbook. Expect "where did my outfit go?" questions. | Testing-guide question: after generating, ask them to find it again tomorrow. |
| 5.4 | ⚪ | Generation overlay ("One prompt. Dressed for anything." + Cancel after 15s) is calm and honest. | Keep. |

### 6 · Swap / add-via-swap

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 6.1 | 🟡 | **Grammar bug in the suggestion block:** "You don't have **a outerwear**, but your…" — the template drops the raw category after "a". Two sites: `dashboard-personalize.js` ~12897 and ~17971. | Category-aware phrasing: "You don't own any outerwear yet, …" (works for every category name). |
| 6.2 | 🟠 | **"Shop via Affiliate →" dead-ends in Coming Soon** inside the core swap loop. It's one of two CTAs on an unowned piece; half the modal's actions lead nowhere. | Replace with "Save to wishlist" (the write path exists — `_wlSaveFromItem`) until affiliate is live; the retailer · price line already says where to buy it. |
| 6.3 | ⚪ | **Snap mine → piece lands back in the slot** is the strongest cataloguing motivator in the product and it works. | Make it a scripted task in testing ("the jacket isn't yours — make it yours"), and instrument snap-mine conversions as a headline metric. |

### 7 · The week ahead

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 7.1 | 🔴 | **The Weekly planner card sells a product that no longer exists.** Copy: "Your week mapped day by day — every outfit routed through your own wardrobe, no repeats." / "Seven looks in one pass. Nothing worn twice." / PLAN THE WEEK →. The tap (verified in code) scopes the prompt to **tomorrow** — one day chip. The weekly engine was deleted (ADR-001); day-by-day planning through diary chips is the real model. A tester who taps expecting seven looks gets a text box, and the gap lands on Robes' credibility, not the card's. | Re-copy the card to the day-chip reality now ("Plan the week a day at a time — name tomorrow, Robes dresses it; the diary keeps the week") and rename the CTA ("Plan tomorrow →" or "Start with tomorrow →"). Restore the seven-looks promise only when a week-scale flow returns. **Do this before any user testing.** |
| 7.2 | 🟡 | **The rail is six identical dashed cards** ("add plans… name the day and add a look" ×6) — an invitation repeated six times reads as wallpaper, and the day labels truncate at 1280px ("TODAY · WED …", "TOMORROW · …"). | Give the first empty card a worked example ("dinner with mum") and quiet the rest to bare invitations; shorten the eyebrow ("TODAY · WED 19" without truncation — drop the relative label or the date, not letters). |
| 7.3 | ⚪ | Day-scoping works well once found: chip "FRI, 21 AUG ×", placeholder swap, tone pills. Whether users *understand* the chip means "this prompt is for Friday" is untested. | Testing-guide task: "plan what you'll wear Friday" with no coaching; watch whether they find the rail tap or type a dated prompt. |
| 7.4 | ⚪ | The Diary month is a full viewport of empty cells for a new user. It's correctly secondary (behind the Lookbook seg). | Don't route testers there before a plan exists. |

### 8 · The Travel Edit

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| 8.1 | 🟠 | **"Pack me for…" lands on an empty canvas trip.** Her prompt asked Robes to pack; the trip page answers with four empty day cards, "No looks yet", an empty capsule, and *two more decisions* ("✦ Robes styles the trip →" / "Add a saved look"). The intent has to be re-stated a second time to get what she asked for. | When the committed prompt carried a pack/style verb (or plans), auto-run "Robes styles the trip" on landing — or arm it as a one-tap confirm strip ("Styling the trip around your plans… / adjust first"). The canvas-first landing is right for "plan a trip" intents typed with no ask; it under-serves "pack me". |
| 8.2 | 🟡 | Her plan words ("beach days, one night out") must visibly survive onto the page as day titles / plans. In the stubbed run the page showed no trace of them; verify the `day_intents` → `dayTitles` handoff on live, since losing her words here breaks the product's own "her words render verbatim" rule. | Verify live; if intent-classifier confidence drops the plans, echo them in the unfurl's "Plans noted" strip so nothing silently vanishes. |
| 8.3 | 🟡 | **The empty stage** ("Nothing on the stage. Tap a day above or a look below.") holds a large dashed box between the week and looks before any tap. | Collapse the stage section until first selection — the hint can live in the LOOKS eyebrow ("tap any look to bring it onto the stage" is already there). |
| 8.4 | 🟡 | Filled-button discipline drifts on the trip page: "✦ Robes styles the trip", "+ Look" and "+ Add pieces" are all dark fills on one screen (the app rule: one real commitment per screen carries black). | Demote "+ Look" / "+ Add pieces" to ghost pills; the one commitment on an empty trip is Robes-styles-the-trip. |
| 8.5 | ⚪ | The styled trip's anatomy (week strip with palette swatches → stage → looks with pin state → capsule with pack checkboxes and "Worth adding · genuine gaps only") is coherent and the copy is excellent. Pin-to-a-day via the bar worked. | Testing-guide tasks: pin the unpinned look; pack two pieces; swap one "for this day only" and confirm the badge is understood. |

### Cross-cutting

| # | Sev | Finding | Recommendation |
|---|-----|---------|----------------|
| X.1 | 🟡 | The prompt's typewriter still rotates "Style my Balmain waistcoat" — the fallback demo piece — on an account with real pieces filed. A wardrobe-first product should demo with her wardrobe. | Feed the rotating examples from her own recent pieces once any exist ("Style my acid green jumper three ways"). |
| X.2 | 🟡 | Docs drift: CLAUDE.md describes the post-add fork as firing "after every successful non-edit wardrobe add"; the code gates it at ≥15. Same for any surface that still cites the fork as the FTU payoff. | Update CLAUDE.md so the next session doesn't re-introduce it at 1 piece. |
| X.3 | ⚪ | Instrumentation for the testing guide already exists: `prompt_submitted {source: pill|typed}`, `rail_day_scoped`, `piece_swapped`, `wardrobe_added`, `kp_build_look`, gen_id trails in `/admin`. | Build the guide's metrics section on these — no new capture needed. |

---

## What to delay promoting until she's engaged

The FTU gating already built (index rows, concierge visibility, fork at 15, Style Notes at 15,
moodboards hidden) is broadly right. The remaining ladder, by engagement stage:

**Session one (0–1 pieces, 0 looks) — show only:**
- The styled card → three ways → Build a look loop, the prompt, and the two index rows.
- *Remove from this stage:* the "From a link" door in the add modal (coming-soon), the affiliate CTA
  in swap (coming-soon), the Weekly planner card's current copy (7.1 — it's visible from session one
  via the concierge band, so its promise must be one the product keeps *today*).

**Early cataloguing (2–10 pieces, no saved look):**
- Daily prompt + swap/Snap-mine loop is the engine — promote "Dress today" and the snap loop.
- Keep Travel visible but *quiet* (the card is fine; it's the one edit that works at low piece counts
  because it proposes gaps honestly).
- Hold: Diary month view, Inspiration as a nav destination push, vibe/refine systems — all fine to
  exist, none should be pointed at.

**Engaged (first look saved / first daily kept):**
- This is the moment to introduce the week ahead (rail invitations + day chips) — a user who has
  kept one look understands what a "day wearing a look" means. Before that, the six dashed rail
  cards are answering a question she hasn't asked.
- Post-keep is also the natural moment for the share flow.

**Invested (≥15 pieces):**
- Fork modal (already), Style Notes introduction (already), closet-only promise (already), and —
  when it returns — the true weekly flow. This staging is already correct in code.

---

## Implications for the User Testing Guides

**Scripted tasks (in journey order), with the finding each one probes:**

1. *"Sign up and get to your dashboard."* — time the dark-screen run-in (1.1); note whether the
   splash/intro copy sets expectations they later test (1.2).
2. *"Your first piece is styled three ways — explore, then make one of them yours."* — the guide band
   (2.1): do they read "build from your wardrobe" as "buy these"? Watch the blank tile (2.2).
3. *"Add three more pieces."* — do they find multi-select (3.3)? What do they say after the third
   toast-only add (3.1)?
4. *"Build a look — start from what you're wearing right now."* (added 2026-08-20) — two lanes, let
   the tester choose and record which. **Photo-first:** photograph the complete outfit, attach it as
   the look's photograph ("Add a photo" on the composer — it becomes the look's portrait), then log
   each piece onto the rack (snap or pick). **Pieces-first:** log the pieces one by one and watch the
   mosaic assemble as they land. Watch: do they find the composer at all (BUILD YOUR OWN row, or
   Lookbook → + New)? Do photo-first testers expect Robes to read the pieces out of the outfit photo
   automatically? (Extraction is deliberately not built — this expectation gap is the task's key
   recording.) Do the role strips + the ⊕ on a filled strip guide placement (4.1)? Does the unnamed
   save answer at the click (4.2)? Where do they expect the saved look to live afterwards?
5. *"Ask Robes to dress you for something real this week."* — typed vs pill (X.3 metrics); do they
   understand the vibe read (5.1); do they save, and can they re-find the look (5.3)?
6. *"One piece in the look isn't yours — make it yours."* — the snap-mine loop (6.3); note every tap
   on the affiliate dead end (6.2).
7. *"Plan what you're wearing Friday."* — rail discovery vs dated prompt (7.3); whether the Weekly
   planner card gets tapped and what they expect from it (7.1 — run this task *after* the re-copy).
8. *"You're going away for a long weekend — get packed."* — the double-ask on the canvas landing
   (8.1); whether their stated plans visibly survive (8.2); pin + pack + day-scoped swap (8.5).

**Headline metrics (all already instrumented):** time-to-first-wow (signup → styled card ready),
piece count at end of session one, daily-look keep rate, snap-mine conversions per swap open,
`prompt_submitted` source split, travel intake commit vs abandon.

**Fix-before-testing shortlist:** 7.1 (weekly card copy) · 6.1 (grammar) · 6.2 (affiliate dead end
→ wishlist) · 3.2 (hide link door) · 2.2 (blank tile) — everything else can be observed as-is.
