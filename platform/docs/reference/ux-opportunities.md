# Robes rebuild: UX opportunities

*2026-09-24 · Reference for the Next.js (web) + Expo (native) rebuild on Supabase Postgres/Realtime + SQS/Lambda generation workers + Gemini + Cloudinary.*
*Sources: `CLAUDE.md` on `platform` (the de facto spec, ~1,650 lines of dated deltas), `docs/*.md`, `architecture-decisions.md`, `server.js`, `public/js/dashboard-personalize.js`, and `git log` (645 commits, 159 of them "fix"/"bug").*

This document covers changes that would make the product drastically better to use, not polish. Every pain point cites where it was observed. Every proposal says which part of the new architecture carries it. The product's own design rules still apply and are assumed throughout: one ink fill per screen, no lock/unlock language, no "AI" in consumer copy, wardrobe-first, titles offered not applied, and Look / Wear / Day kept as separate objects.

**Citation keys.** `CL §x` = a CLAUDE.md section or dated delta · `FTUE n.n` = `docs/beta-ftue-ux-audit-2026-08-19.md` finding · `Funnel` = `docs/four-session-funnel-brief.md` · `SysArch` = `docs/system-architecture.md` · `DayCard D-nn` = `docs/daycard-audit.md` · `LookRack` = the two look-rack audits · `LookEntity` = `docs/look-entity-brief.md` · `Avatar` = the avatar brief/proposal · `ADR-00n` = `architecture-decisions.md` · a short hash = a commit.

**Effort key.** S ≤ 1 engineer-week · M = 1–3 weeks · L > 3 weeks (all for the rebuild, not the legacy app).
**Priority key.** **P0** must ship in the rebuild's first release · **P1** ships within the first quarter after · **P2** later or behind an experiment.

---

## 1. Current UX pain points (evidence-based)

### 1.1 Waits that are long, opaque and fragile

- **The text arrives all at once, behind a full-screen blur.** `/api/style`, `/api/daily` and `/api/travel` return the whole JSON document in one response. Until then she sits behind `kp-loading-overlay`, which has a 90s hard abort and a "Cancel" link that only appears after 15s (`CL §Generation overlays`). The server adds a model fallback chain (2.5-flash → 2.5-pro) and exponential retries (`server.js` 800ms·2^i). The rebuild brief measured text at 3–98s. `CL 2026-09-21` says it directly: "a 20–40s build with no signal reads as frozen."
- **Images come one at a time, then add up.** Each image takes 20–50s (race timeouts 40–60s). Every image loop runs *sequentially* with a 3s stagger and one retry after an 8s pause (`server.js` ~666/1080/1201/1979/2836/3345; `CL §Background image generation`). This is because all beta users share one Gemini key (`CL`: "the next lever is Gemini quota tier, not code"). A daily look (one editorial frame plus a still per unowned piece, 5–8 images) therefore takes minutes. The client poll ceilings were raised 90s → 300s for key pieces and 5 min for daily to cope. An avatar render can hit 3 attempts × 60s with 8s + 20s pauses.
- **Polling is doing the work of events.** `_kpPollImages` checks every 3.5s, `_mbPollImages` and `_dlPollImages` every 4s, and the model cell poll runs for up to 180s. Even the nav's active tab comes from a **350ms DOM poll** (`CL 2026-07-20 Nav architecture`). The dashboard file holds 63 poll or `setInterval` sites.
- **Leaving can lose work.** Image jobs live in an in-memory `imageJobs` Map with a 10-minute TTL, so a redeploy or restart drops them. Onboarding's CTA *holds ~4s* so that "the killed-on-navigation `/api/style`" gets a head start (`CL §Onboarding flow`). Images only survive navigation because `_kpPersistImages` patches the saved row on every tick. The Style step in onboarding exists partly "to fill the 30–90s imagery wait" (`CL 2026-09-21 slice 7`).
- **No way to be told when it's done.** Email is the only channel, and web push is "phase 2" (`CL 2026-09-21 slice 6`). The `looks_ready` mail is the only "your looks are ready" signal. Migration 22 has not been run on production.

### 1.2 Persistence and sync she can feel

- **Saves have not always survived a reload.** Saved looks were localStorage-only until testers saw "Nothing saved yet" after a reload and blank tiles on revisit (`CL §Lookbook + moodboard cloud persistence`). Today localStorage is still the instant cache, cloud writes are fire-and-forget, and the app "silently degrades to local-only" when a migration is missing.
- **Derived data breaks quietly.** One unknown field made PostgREST reject a *whole* `planned_days` batch, so trip days vanished from the Diary. The index now "heals" whenever a trip is opened (`CL 2026-09-22`). A duplicate hoisted function silently changed every date format ("Sept") (`CL 2026-09-21`). Two id schemes (client `Date.now()` and uuid) coexist (`SysArch §5 Known seams`). Render-authoritative JSON blobs sit behind every trip, day and key piece.
- **Overlays stack in the wrong order.** Four result pages are equal-z fixed overlays, so "DOM order (not open order) decides stacking" (`CL §THIS BRANCH`). A look-card tap rendered *under* the Lookbook, so a successful save read as a failed one (`CL 2026-08-10`).

### 1.3 Cold start: nothing pays off between piece 2 and piece 14

- The styling posture changes at 0 / 1–14 / 15 pieces (`CL §Style DNA`, `§Cold-Start`), and the capability ladder is 5 / 10 / 15 (`CL 2026-09-18`). The first-session audit found "no payoff moment between piece 2 and piece 14" (`FTUE 3.1`).
- **The first act after the wow is a shopping list.** At one piece, "Build this look" lists mostly unowned proposals, which invites "do I have to buy all this?" (`FTUE 2.1`). Unowned tiles rendered permanently blank (`FTUE 2.2`).
- **Nothing brings her back for a second session.** "Sessions 2–4 are mostly built but undoored, and nothing in the product causes session two to begin" (`Funnel §What this is`).

### 1.4 Getting her wardrobe in is a chore

- **Each piece is a separate event.** Photo → "Reading your piece…" → reveal → confirm → save. A batch is a *queue of the same modal*, one analysis at a time (`CL §3-step wardrobe add flow`). Multi-select is "one quiet line in the dropzone" that users may never find (`FTUE 3.3`).
- **The web can't reach the camera properly.** iOS always puts its source sheet in front of the file input, a platform ceiling (`CL`, commit `c02f850`).
- **There are no cutouts.** Flat-lay photos with their backgrounds feed every mosaic. Garment extraction from an outfit photo is "deliberately not built". Testers expected it ("the task's key recording", `FTUE` testing task 4; `LookEntity §3 Phase 3`).
- **The text doors arrived late and needed a correction.** Forwarding a receipt and pasting a link only landed on 2026-09-22 (`aefda53`). The receipt read was wrong until a vision pass was added: "a pink tracksuit filed as 'Blue denim jeans'" (`d97b43c`). Migration 23 has not been run on production.

### 1.5 Onboarding keeps being re-cut

- The dark-screen run-in (splash → intro → name) was flagged (`FTUE 1.1`). The intro was folded into the name screen, reverted, then cut, all on one day (`e042142`, `3eaca87`, `6ccfb52`). The name is re-asked even though signup already knows it.

### 1.6 The information architecture never settled

- **The navigation changed six times in nine weeks.** Three destinations (07-20) → Wardrobe/Lookbook/Calendar (08-08) → Wardrobe/Lookbook/Inspiration (08-10) → Lookbook/Diary/Wardrobe/Inspiration plus Home as a **five-tab dock with 9.5px labels** (09-08) → "eleven screens carried five ways to go back" (09-10) → seven IA-consistency decisions (09-15) (`CL` deltas on those dates).
- **Home crowds itself.** The first-look home carried **fourteen doors and three cataloguing asks** (`CL 2026-09-18`). The Weekly card sold a product that had been deleted (`FTUE 7.1` 🔴, `ADR-001`). Doors led to "Coming soon" (affiliate, link import) (`FTUE 3.2`, `6.2`).
- **The vocabulary is too big.** Key piece, Inspiration, Lookbook, Look, Daily look, Diary, Day, Trip / Travel edit / Holiday edit, Capsule, Style notes, Your Model, Concierge, Rack, Proposal, Wishlist. Verbs collide too: "Wear it today" logs a wear, but people expect it to *style* the look for today (`product-naming-map.md` "Partial").
- **The same concept rendered differently on each surface.** The day card was built four ways (`DayCard D-05`, `D-10`). The Look/Rack console had one dark inline-styled variant (`LookRack §1.1`). These were converged by rule, not by construction.

### 1.7 Desktop-first, and slow to load

- **The phone gets the leftovers.** The layout spec is a 1440 shell. The tablet band is "desktop-shaped", and mobile is ≤767px overrides layered on top (`CL 2026-07-20 Layout spec`). Key affordances are hover-only: flick arrows `.wk-tnav`, the hover Wear pill, and the disabled-Save reason carried in a `title` that "touch users never see" (`FTUE 4.2`). There are iOS zoom and `dvh` workarounds.
- **The page is heavy.** `dashboard-personalize.js` is **1.76 MB, 27.6k lines, unminified, no build step**, plus 171 KB `dashboard.html`, ~140 KB bundle JS and ~490 KB of fonts: roughly **2.5 MB before a single image**. The boot waits "until the wardrobe AND wishlist have loaded" before deep links resolve (`CL §piece page`).
- **Type is small.** Many eyebrows and labels are 9–11px (`CL 2026-09-21`: "9px/.18em"), below comfortable legibility and the Dynamic Type baseline.

### 1.8 Dialogs, errors and trust

- **Confirmations where undo would do.** Deletes and unpins sit behind `_rbConfirmDelete` modals ("Take '{name}' off Thu 10 Sep?"). The one exception already shows the better pattern: "Wear it today" is a tap with a quiet undo (`product-naming-map.md`).
- **One bad schema can take everything down.** An empty enum value 400'd every daily and travel generation for everyone (`2ad07a5`). Colour analysis got stuck on "Reading your colouring" (`7d76432`). All users share one API key and quota.
- **Learning doesn't show.** "Intelligence not reading as cumulative" is known gap #4 (`LookEntity §1`). Thumbs per look arrived only on 2026-09-17 (`9ea233e`).

---

## 2. Drastic improvements

Summary first, detail after.

| # | Improvement | Priority | Effort | Platform |
|---|---|---|---|---|
| D1 | One durable generation job model, with Realtime and no polling | **P0** | L | both |
| D2 | Streamed, staged results: copy in 2–3s, images land one by one | **P0** | M | both |
| D3 | Resumable generations, a generation tray, and "ready" push | **P0** | M | both |
| D4 | Parallel, prioritised, cached imagery (hero first, stills on demand) | **P0** | M | server |
| D5 | Instant navigation: server-canonical data, optimistic mutations, prefetch | **P0** | M | both |
| D6 | Skeletons matched to the final layout; stable 4:5 frames; blur-up | **P0** | S | both |
| D7 | Capture at speed: native multi-shot, camera-roll batch, background tagging, one review inbox | **P0** | L | native-led |
| D8 | Cutouts: background removal on every piece | P1 | M | server |
| D9 | Value before fifteen: starter wardrobe, honest borrowing, three-ways at piece zero | **P0** | M | both |
| D10 | Onboarding in two screens, value inside 60s | **P0** | S | both |
| D11 | One IA: four destinations plus one Create action (section 3) | **P0** | M | both |
| D12 | Deep links, universal links and the native share sheet | **P0** | M | both |
| D13 | Undo, not confirm | **P0** | S | both |
| D14 | Error recovery: partial results, per-item retry, input never lost | **P0** | S | both |
| D15 | Accessibility baseline (WCAG 2.2 AA, Dynamic Type, screen readers) | **P0** | M | both |
| D16 | Performance budgets enforced in CI (section 4) | **P0** | S | both |
| D17 | Offline read of wardrobe, looks and plan; queued writes | P1 | M | native first |
| D18 | Today's look, pre-made overnight, with the morning push | P1 | M | both |
| D19 | Feedback loops and visible taste memory | P1 | M | both |
| D20 | Share extension: "Share to Robes" from Safari, Instagram, retailer apps | P1 | M | native |
| D21 | Haptics and motion as feedback | P1 | S | native |
| D22 | i18n, currency and units readiness | P1 (readiness is P0) | S | both |
| D23 | Home-screen / lock-screen widget: today's look + weather | P2 | M | native |
| D24 | Calendar integration: days name themselves | P2 | M | native |
| D25 | Outfit photo → pieces (garment extraction, match-first) | P2 | L | server |

---

### D1 · One durable generation job model, with Realtime and no polling — P0 · L · both

- **What.** Every generation (key piece three ways, daily, trip, Robes build, alternates, avatar render, piece analysis, receipt read, link read) becomes a **`generation_jobs` row** with child **`generation_parts`**: one per look's text, per image and per piece still. Each row has a status (`queued → running → partial → done | failed | cancelled`), a progress field, a result pointer and an idempotency key. The client subscribes to its own rows over Supabase Realtime (Postgres Changes, RLS-scoped).
- **Why.** This removes the 63 poll sites, the in-memory `imageJobs` Map that dies on deploy, the 90s abort ceilings and the "hold the CTA 4s so the request survives navigation" hack (§1.1). Being able to tell her "in progress, and it's still going" is the precondition for every other wait-state improvement.
- **How.**
  - The API route (Next route handler / edge function) validates, inserts the job, enqueues to SQS and returns `{jobId}` in under 300ms.
  - Lambda workers run each part. Provider rate limits live in per-queue reserved concurrency and a token bucket, not `setTimeout(3000)` in request code. Retries go through SQS redrive plus a DLQ.
  - Workers write parts as they finish, and Realtime pushes them to the client.
  - Cancel sets `cancel_requested`. Workers check it between parts, so a cancel stops the spend as well as the UI.
  - `generation_log` becomes a view over the same rows, so admin traceability improves.

### D2 · Streamed, staged results: copy in 2–3s, images land one by one — P0 · M · both

- **What.** Split every styling call into **stage A**, a fast skeleton pass (look names, piece list with owned/unowned flags, one-line verdicts; flash with thinking 0, small schema, target ≤3s), and **stage B**, enrichment (stylist notes, how-to-wear, tags). Images are **stage C**. The result screen opens *at submit* with skeletons (D6). Stage A replaces them within 2–3s, and each image fades into its fixed 4:5 frame as its part completes.
- **Why.** Today's slowest moment, a blur overlay for 3–98s, becomes "reading her looks within three seconds." Those seconds carry the product's value: the looks are words and her pieces before they are pictures. This also removes the need for onboarding's Style step to exist as wait-filler.
- **How.** Stage A is written as `generation_parts` rows per look (per-look granularity is enough; token streaming is not needed through Lambda). For the one interactive surface where token-level streaming matters (the prompt's first line, "Robes read *Undone* as the vibe"), a Next route handler can stream Gemini directly over SSE while the worker path runs in parallel. Owned pieces render *immediately* from her wardrobe photos. Only unowned stills and the editorial frame wait.

### D3 · Resumable generations, a generation tray, and "ready" push — P0 · M · both

- **What.** A job belongs to the user, not the screen. Closing the app, refreshing or navigating away changes nothing. A persistent **generation tray** (a small chip in the nav or at the bottom of Today) shows in-flight jobs ("Three ways with your green jumper · 2 of 3 frames"). Tapping it returns to the result wherever she is. On native, completion while backgrounded fires a push: "Your looks are ready." On web, the tab title badge updates, plus Web Push once she has opted in.
- **Why.** Generations take 30s to several minutes (§1.1). Making her wait on-screen is the single biggest waste of her attention in the product. It also dissolves onboarding's timing hacks and the travel "double ask" (`FTUE 8.1`): a trip can style itself while she keeps planning.
- **How.** The job rows (D1) are the truth. The client rehydrates in-flight jobs on boot (`select … where status in (queued, running, partial)`). Push goes through Expo Notifications, triggered by a worker's terminal-state write (a DB webhook → Lambda → Expo push API). It reuses the `notifications` ledger and preferences from slice 6. Deep links land on the result (D12).

### D4 · Parallel, prioritised, cached imagery — P0 · M · server

- **What.**
  1. **Priority order**: the editorial frame for look 1 first, then looks 2–3, then per-piece stills.
  2. **Parallel** within a per-user and global concurrency budget, not a sequential 3s stagger.
  3. **Stills on demand**: generate an unowned piece's still only when its row is rendered in view or the look is saved. Proposals in collapsed racks never cost an image.
  4. **A shared still cache** keyed by a normalised garment descriptor (`category_l3 + colour + material + silhouette`), so "camel wool trench, belted" renders once for everyone and is instant after that.
  5. A **dedicated provider quota tier** instead of one shared key.
- **Why.** Time to all images for a daily look drops from minutes to under a minute (budget §4). Cost drops too, because most proposal stills are never looked at. The cache turns the slowest element into the fastest one.
- **How.** SQS FIFO message groups or priority queues per job. A `still_cache` table (descriptor hash → Cloudinary public id). Workers check the cache before calling Gemini. Cloudinary stores the originals, and the client asks for exact sizes (D6).

### D5 · Instant navigation: server-canonical data, optimistic mutations, prefetch — P0 · M · both

- **What.** Every tap on a tab, card or back button paints from cache in the same frame. Every save, pin, wear, swap and rename updates the UI optimistically and reconciles later. **Server-minted uuids for every entity** replace client `Date.now()` ids. Days, trip days and key-piece ways are **first-class rows**, not positions inside blobs. `planned_days` stops being a derived index that can go stale.
- **Why.** This fixes the whole class of §1.2 failures (lost saves, a Diary emptied by a rejected batch, overlay stacking, "heals on open") by construction rather than by harness. The product feels native instead of "loading…".
- **How.**
  - Web: RSC renders the shell and first data. TanStack Query is hydrated from RSC payloads. `<Link prefetch>` plus `queryClient.prefetchQuery` on hover and viewport entry. Route-level code splitting.
  - Native: Expo Router plus TanStack Query persisted to MMKV. Supabase Realtime invalidates the relevant query keys.
  - Mutations go through one typed client with optimistic updaters and rollback toasts.
  - Postgres constraints (not client code) enforce the Look/Wear/Day rules (`SysArch §5`).
  - Real routes replace the overlay stack, so "the page on top" always means "the current route."

### D6 · Skeletons matched to the final layout; stable frames; blur-up — P0 · S · both

- **What.** Each result surface has a skeleton with the *final* geometry: three 4:5 frames, the rack rows, the title block. Nothing shifts when content lands. Every image carries a stored **blurhash/thumbhash** (computed at upload or generation time), so it paints instantly and sharpens in. Cloudinary URLs are always size-exact (`w_`, `dpr_`, `f_auto`, `q_auto`, `c_fill,ar_4:5`).
- **Why.** Legacy placeholders were spinners, pulses and permanently blank beige tiles (`FTUE 2.2`). Layout-stable skeletons make a 20s image wait feel like progress.
- **How.** One `<Frame>` primitive shared by web and native through a common design-token package. `blurhash` is a column on pieces, looks and parts. A Cloudinary loader for `next/image` and `expo-image` (disk-cached, with a placeholder prop).

### D7 · Capture at speed: native multi-shot, camera-roll batch, background tagging, one review inbox — P0 · L · native-led

- **What.**
  - **Multi-shot camera** (native, VisionCamera): a "hanger mode" where she shoots piece after piece. Each shutter is ready for the next in under 300ms, with a counter and a thumbnail strip, and no per-piece modal.
  - **Camera-roll batch**: select 30 photos in one go.
  - Every photo **uploads in the background** (direct signed Cloudinary upload, resumable, survives app close). The piece appears in the wardrobe *immediately* in a "reading" state, while the analysis job (D1) tags category, colour, brand, cut, season and price hints.
  - **One Inbox** gathers everything that needs her eye: photos Robes wasn't sure about, receipt reads and link reads, all in the existing receipt-queue pattern ("14 pieces read · Review them →", `CL 2026-09-22`). A confident read is filed without asking. She reviews exceptions, not every piece.
  - The three text doors (forward a receipt, paste a link, and D20's share extension) are first-class and equal to the camera from day one.
- **Why.** Cataloguing is "the first touchpoint and the one that must be effortless" (`CL 2026-09-22`), and today it is serial (§1.4). Moving from about 45s per piece to about 5s per piece is the difference between reaching 15 pieces in session one and never reaching it. The whole 5/10/15 ladder depends on this.
- **How.** An `ingest_items` table (one row per candidate, any source) → an analysis job → auto-file at confidence ≥ threshold, else hold in the Inbox. Upload through `expo-file-system` background tasks. Web keeps drag-and-drop multi-file plus paste-image-from-clipboard. The existing `inbox.js` grounded-read rules (label as printed, vision pass from the photograph) carry over.

### D8 · Cutouts on every piece — P1 · M · server

- **What.** Background removal on every piece photo (Cloudinary `e_background_removal`, or a segmentation model in the worker), stored as a transparent cutout next to the original. Mosaics, racks and look canvases use cutouts on the cream ground.
- **Why.** Her wardrobe instantly looks like a catalogue rather than a camera roll. Mosaics read as outfits. Avatar renders also get cleaner garment references (`Avatar §2`).
- **How.** It is one more part in the analysis job, so it costs no extra UI. The build is P0-ready (the column and pipeline slot exist). Switching it on is P1, pending cost and quality review.

### D9 · Value before fifteen — P0 · M · both

- **What.**
  1. **Starter wardrobe**: in onboarding or at any time, "Tap what you own." A visual grid of about 40 generic staples (white tee, straight jeans, black blazer, trench…) drawn from the shared still cache. Ten taps give ten pieces, marked *stand-ins*, rendered with a distinct treatment, and replaced with one tap when photographed ("Swap in yours", the slice-4 mechanic).
  2. **Three ways at piece zero**: a pasted link or a wishlist piece can be styled before anything is owned.
  3. **Every add pays**: the toast names what the piece just made possible ("Filed. Tomorrow's look can use it."), and the next line (slice 1) points to the next act.
  4. **Honest borrowing copy** everywhere (`FTUE 2.1`): "built around yours, Robes borrows the rest."
- **Why.** The ladder asks for 5, 10 and 15 photographed pieces before the product shows its core promise (§1.3). Stand-ins let the wardrobe-first engine work in session one. The swap-in mechanic then turns every stand-in into a reason to photograph a real piece, which is exactly what the Session-2/3 funnel wants (`Funnel`).
- **How.** A `wardrobe_items.kind ∈ {owned, stand_in}` with a `stand_in_ref` to the still cache. Styling prompts treat stand-ins as owned-but-generic. Stats and cost-per-wear exclude them. *Note:* this deliberately revisits the rule "Robes never hangs a piece she hasn't photographed" (`CL 2026-09-21`). It is a founder call, flagged here.

### D10 · Onboarding in two screens, value inside 60s — P0 · S · both

- **What.** Sign in with Apple or Google (native, one tap), then **screen 1**: "Show Robes one piece" (camera, library, paste a link, or pick a stand-in). Generation starts on capture (D2/D3). **Screen 2** is the result itself, streaming in. Taste questions (icons, archetype) move *inside* the result as an optional card ("Tell Robes whose style you admire and it'll sharpen these") instead of being a step. The name comes from auth, and there is no splash.
- **Why.** Onboarding has been re-cut repeatedly (§1.5). Its Style step exists to fill a wait that D2/D3 remove. Time-to-first-wow is the headline metric (`FTUE` headline metrics).
- **How.** An auth provider plus a profile row minted by a trigger (as today). `onboarded_at` is set on the first job. The "skip never survives an answer" rule carries over.

### D11 · One IA — P0 · M · both

See section 3. Four destinations and one Create action. Inspiration and the Home/Diary split are merged away. Every detail is a real route, with one back behaviour.

### D12 · Deep links, universal links and the native share sheet — P0 · M · both

- **What.** One shared route table for Next and Expo Router: `/look/:id`, `/piece/:id`, `/day/:date`, `/trip/:id`, `/inbox`, `/share/:shareId`, `/generate/:jobId`. These are iOS Universal Links and Android App Links, so an email CTA ("Robes read your Zara receipt → Review") opens the app when it's installed and the web otherwise. The native share sheet shares a **rendered look card image** (OG image via Next `ImageResponse`, cached in Cloudinary), not just a URL. Instagram Stories sharing uses the sticker/background API.
- **Why.** Legacy deep links are query-param boot branches that poll until data loads (`?receipts=1`, `?open=&fill=1`, `CL 2026-09-21/23`). Sharing is a modal with IG-handle capture. Re-engagement (slice 6) only works if the link lands exactly where the email says.
- **How.** An `apple-app-site-association` file plus `assetlinks.json` served by Next. Share pages are RSC, statically cached, with ≤90 KB JS.

### D13 · Undo, not confirm — P0 · S · both

- **What.** Every destructive action (delete a look, trip or piece; unpin; remove from a day; discard a draft) runs immediately with a 6–8s **Undo** snackbar. Server-side it is a soft delete (`deleted_at`), with a purge job after 30 days and a "Recently deleted" list under You. Irreversible confirmation stays only for account deletion.
- **Why.** It removes a modal from every tidy-up (§1.8) and makes the app feel fast and forgiving. The wear log's quiet undo already proves the pattern works in this product.
- **How.** A `deleted_at` column on every user-owned table, with RLS views filtering it. The optimistic mutation (D5) holds the rollback.

### D14 · Error recovery: partial results, per-item retry, input never lost — P0 · S · both

- **What.** A failed image part shows its tile with "Try this one again". Failed text for one look leaves the other two standing. Her prompt, photo and brief are stored on the job, so a failure (or a crash) returns her to her own words, prefilled. Provider outages show a single calm status line on Today ("Robes is slower than usual right now"), not a failed toast on every attempt. Copy stays product-voiced, never raw server text (a legacy rule worth keeping).
- **Why.** Legacy failures were all-or-nothing and occasionally global (§1.8). Generation is probabilistic, so the UX has to assume partial success.
- **How.** Part-level status (D1). **Schema contract tests** run every structured-output schema against the provider in CI (this would have caught `2ad07a5`). A canary job runs every 5 minutes, and a `system_status` row is read over Realtime.

### D15 · Accessibility baseline — P0 · M · both

- **What.** WCAG 2.2 AA. A minimum of 12pt/16px body and 11pt labels (no 9px eyebrows). Dynamic Type and browser zoom to 200% without clipping. Contrast ≥ 4.5:1: legacy `--ink-soft` and the rose eyebrows need checking. Every image has alt text from the piece label or look name (already produced by analysis). Every hover affordance has a visible touch equivalent. 44pt/48dp targets. Screen-reader labels on icon buttons, which legacy names only "on hover/focus" (`CL 2026-09-21`). Reduced-motion respected. Generation progress is announced politely.
- **Why.** The legacy type scale and hover-only controls exclude people and make the phone experience worse for everyone (§1.7).
- **How.** Tokens enforce minimum sizes. Automated axe (web) and `@testing-library/react-native` accessibility queries in CI. A manual VoiceOver/TalkBack pass on the P0 journeys before launch.

### D16 · Performance budgets enforced in CI — P0 · S · both

Section 4 gives the numbers. Enforcement: `size-limit` or Next bundle analysis per route, Lighthouse CI on the five key routes, and Expo bundle size plus startup traces (Hermes profiler, `react-native-performance`) in CI on a mid-tier Android reference device. A regression blocks the merge.

### D17 · Offline read, queued writes — P1 · M · native first

- **What.** Wardrobe, looks, the plan (the next 30 days) and today's look are readable offline, images included (expo-image disk cache pinned for owned pieces and saved looks). Wear logging, pinning, renaming and tagging are queued offline and replayed. Generation shows "Robes will start this when you're back online" and enqueues on reconnect.
- **Why.** The moment of use is the wardrobe door in the morning, on a plane, or at a hotel with bad Wi-Fi (trips are a core track).
- **How.** The TanStack Query persister (MMKV), a mutation queue with idempotency keys, and web IndexedDB through the same persister (lower priority).

### D18 · Today's look, pre-made overnight, with the morning push — P1 · M · both

- **What.** For users who opted into the morning cue and were active in the last 7 days, a scheduled worker composes **today's look** before her `morning_hour`. It uses the local forecast, her named day and her recent wears (no repeats). The push reads "Tue · 14°, showers · Dinner with Mum — your look is ready." Opening it shows the finished look with zero wait: Wear it / Swap a piece / Try another.
- **Why.** It turns the habit loop (Session 4) from "open app → type → wait 60s" into "glance → wear." It is the strongest retention lever the architecture makes cheap. The legacy morning cue exists only as an email, and only when a day is already planned (`CL 2026-09-21 slice 6`).
- **How.** EventBridge Scheduler → SQS per timezone bucket. The job is the same daily generation (D1) with `source: 'scheduled'`. The cost cap is per-user opt-in plus the activity window, and images for owned pieces cost nothing.

### D19 · Feedback loops and visible taste memory — P1 · M · both

- **What.**
  - Per look: 👍/👎 (exists) plus **"More like this"** and **Restyle with a nudge** (chips: warmer · more casual · more colour · no heels).
  - Per piece in a proposal: **"Not for me"**, meaning never suggest this again.
  - A **Taste page under You** that shows what Robes has learned, in her words ("You reach for wide-leg trousers", "You've said no to skinny jeans", "Your most-worn look: *The Thursday one*, 11 wears"), each line editable or removable.
- **Why.** "Intelligence not reading as cumulative" (`LookEntity §1`). Visible memory builds trust and gives a reason to keep feeding the wardrobe. Wears and saved looks are the labelled examples (`LookEntity`).
- **How.** `preference_signals` (event-sourced) → a nightly `taste_profile` summariser → injected into prompts next to `style_dna`. Every signal is tied to its source for explainability.

### D20 · Share extension: "Share to Robes" — P1 · M · native

- **What.** An iOS Share Extension and Android share target. From Safari, Instagram, Zara or Pinterest, "Share → Robes → Wardrobe | Wishlist | Style this." It runs the same link and image read as "Paste a link" (`inbox.readProductPage`) and lands in the Inbox (D7).
- **Why.** Product discovery happens outside Robes. Wishlist `source_type` already anticipates instagram, substack and screenshot (`product-naming-map.md`). This makes those real without copy-paste.
- **How.** An Expo config plugin (`expo-share-intent` or a custom target), posting to the ingest API.

### D21 · Haptics and motion as feedback — P1 · S · native

- Light impact on save, wear logged, pin and swap. A success notification haptic when a generation completes in the foreground. A selection tick on the flick-through. Motion: images cross-fade from blurhash, and the tray chip morphs into the result. Reduced-motion is honoured.

### D22 · i18n, currency and units — P1 (readiness P0) · S · both

- **P0 readiness.** No hard-coded strings in components: a copy registry that keeps the curated voice in one place. Every date through `Intl` (the "Sept" bug, `CL 2026-09-21`). Price stored as minor units plus `currency` (the column exists since migration 23). Size stored with its system (EU/UK/US). Temperature and units follow the locale.
- **P1.** Locale switching, currency display per locale, and size conversion hints on the piece page.

### D23 · Widget: today's look + weather — P2 · M · native

- A home-screen and lock-screen widget (WidgetKit / Glance) showing today's look frame, the day's name and the forecast, tapping through to `/day/today`. It depends on D18 and D17's cached image. (`expo-apple-targets` / custom config plugin.)

### D24 · Calendar integration — P2 · M · native

- Opt-in read of the device calendar (`expo-calendar`), so days name themselves ("Fri · Dinner with Mum", "Tue–Thu · Lisbon") and the week rule ("Nothing planned this week. Name a day…", `Funnel 1.1`) mostly answers itself. Nothing is written to her calendar and nothing is inferred without showing the source. Honour "Robes never asserts her plans" by *offering* names ("From your calendar: Dinner with Mum — use it?").

### D25 · Outfit photo → pieces — P2 · L · server

- Photograph what she's wearing and Robes finds the pieces. It **matches to her wardrobe first** and proposes new pieces only for leftovers (`LookEntity B6` match-first). It ships behind a flag after D8 cutouts give clean references. Testing showed users expect this (`FTUE` task 4).

---

## 3. Proposed information architecture

### 3.1 Principles

1. **Four places, one verb.** People think in *today*, *my clothes*, *my outfits* and *what's coming*. Everything Robes makes is either a look (saved or not yet) or a plan. Creating anything (a piece, a look, a trip, a question to Robes) is **one Create action**, reachable from everywhere.
2. **Real routes, one back.** Every detail is a URL, and back is the platform's back (stack on native, history on web). There is no overlay stack and no poll-derived "lit" state (§1.2, §1.6).
3. **The same IA on both platforms.** A native tab bar and a web top/side nav share destinations, routes and names. Only the chrome differs.
4. **A smaller vocabulary.** Look (saved) and *Ideas* (Robes' unsaved output). "Key piece", "Inspiration", "Daily look", "Concierge" and "Lookbook" are retired as navigation words. Key-piece styling becomes the verb "Style a piece", whose output lives in Ideas. "Trip" replaces Travel edit / Holiday edit. "Wear" stays the scheduling verb (legacy rule). "Style it for today" is the name for the distinct generation verb (`product-naming-map.md`).

### 3.2 Structure

**Native (Expo Router tabs):** `Today` · `Wardrobe` · **[ + ]** · `Looks` · `Plan`. "You" sits behind the avatar at the top-right of every root.
**Web (Next.js):** a top nav at ≥1024 (a side rail is optional later) with `Today · Wardrobe · Looks · Plan`, a persistent **Create** button, an avatar menu for You, and **⌘K**, which opens the prompt / command bar anywhere. Below 768px the web mirrors the native tab bar.

| Destination | What it answers | Contents |
|---|---|---|
| **Today** (`/`) | "What am I wearing / doing now?" | Greeting plus **one** next step (slice 1's next line) · **today's look** card (D18) with weather · the **Ask Robes** prompt with its three starters (Style today · Plan a trip · Style a piece) · the **generation tray** (D3) · the week strip (the next 7 days, tap → Plan) · the Inbox count when pieces are waiting · the model door when relevant. Hard cap: one ink fill and ≤7 doors (the 2026-09-18 home-cut rule). |
| **Wardrobe** (`/wardrobe`) | "What do I have?" | Segments: **Pieces** · **Wishlist** · **Inbox** (review queue for photos, receipts, links and shares, D7). Refine (category/type, season, wear-it-for, source), hero pieces pinned at the top, stand-ins marked (D9). → `/piece/:id`. |
| **Looks** (`/looks`) | "What can I wear?" | Segments: **Saved** (the Look entity grid; sort by last worn; Refine by tags/season/vibe) · **Ideas** (Robes' unsaved output: pieces styled three ways, daily proposals, Robes builds; one tap to save; auto-expire after 30 days unless saved). → `/look/:id` (the Look/Rack page: Wear it today · Wear on a day · Pack it · Swap a piece; You/Model views). |
| **Plan** (`/plan`) | "What's coming?" | The rolling 30-day list (default) and a Month toggle · trips as blocks inside the list · + Name a day / + Plan a trip. → `/day/:date` (a day holds many looks) · `/trip/:id` (facts, weather, travel diary, looks, capsule / packing). |
| **Create** (+ / Create / ⌘K) | "Add or make something" | A sheet: **Photograph pieces** (multi-shot) · **From camera roll** · **Paste a link** · **Forward a receipt** (her address + copy) · **New look** (composer) · **Ask Robes** (prompt) · **Plan a trip**. Context-aware: inside a trip, "New look" pins to it. |
| **You** (avatar) | "Who Robes thinks I am" | **Your model** (reveal, adjust) · **Taste** (colour notes, line notes, icons/archetype, budget, and D19's learned memory) · Notifications (looks ready, morning cue, nudges, receipts) · Account · Recently deleted · Legal. |

### 3.3 Legacy surface → new home

| Legacy surface (route / id) | New home | Note |
|---|---|---|
| Beta landing `index.html` / waitlist on `main` | Marketing site (Next RSC, `/`) for signed-out users | Signed-in `/` is Today |
| `/signup`, `/reset`, `signup.html?mode=reset` | `/auth/*` + native auth screens | Apple/Google native sign-in |
| `/onboarding` (splash → name → piece → style) | Two-screen onboarding (D10) | Style questions become an optional card on the first result |
| Dashboard home: masthead + next line (`.dash-echo`) | Today: greeting + next step | Same rule engine (`_rbNextLine`) |
| Home prompt (`#cb-ta`) + three pills + + menu | Today: Ask Robes; also ⌘K and Create → Ask Robes | Attachments via Create |
| Home week-ahead rail (`_rbRail`) | Today: week strip → Plan | One DayCard renderer |
| Concierge band + learning meter (`#rb-svc-learn`) | Retired; the ladder becomes the next step + Wardrobe header progress | The legacy band retired at 15 already |
| "Your piece, styled" card (`#rb-styled`) | The generation tray → result in Looks › Ideas | |
| Model door (`#rb-model-door`) | Today (conditional) → You › Your model | |
| Your looks row / first-look card | Today (conditional) → Looks › Saved | |
| Inspiration tab (`/inspiration`, key pieces styled) | **Looks › Ideas** | Removes one tab |
| Key-piece result (`#kp-result-page`) + Build this look | `/ideas/:id` (three ways) → composer draft → `/look/:id` on save | |
| Daily console (`__dlRenderResult`, `/api/daily`) | `/ideas/:id` for a fresh proposal; `/day/:date` once kept | Keep-to-save rule retained |
| Lookbook (`/lookbook`, `/looks`, `#sn-page`) | **Looks › Saved** | |
| Look detail / composer / variant promotion | `/look/:id`, `/look/new`, `/look/:id/edit` | Promotion gate unchanged |
| Diary tab (`/diary`, `/calendar`) list + month | **Plan** | |
| Day page (`__rbDayOpen`) | `/day/:date` | |
| Travel edit / holiday edit (`__tvRenderResult`, trip page, capsule) | `/trip/:id` under Plan | |
| Weekly plan (`/api/weekly`, removed ADR-001) | Not rebuilt; "Plan my week" = a guided walk over `/plan` (slice 5) | |
| Wardrobe (`/wardrobe`, All pieces, Refine, Hero Rack) | Wardrobe › Pieces | |
| Wishlist (`/wishlist`, "I bought this") | Wardrobe › Wishlist | |
| Receipt strip + queue (`#rb-wg-inbox`, `__waInboxOpen`) | **Wardrobe › Inbox** (all ingest sources) | |
| Add modal ways chooser (`WA.open({way:'choose'})`) | Create sheet | |
| Piece page (`/piece/:id`) | `/piece/:id` | |
| Swap modal (`_rbSwapModal`) + Snap mine | Bottom sheet on the look/day/trip routes | Snap mine opens multi-shot with a brief |
| Style notes (`/stylenotes`): Your Model, colour, silhouette, taste & budget | **You** › Your model / Taste | |
| Account details modal, gender identity, notification prefs | You › Account / Notifications | |
| Share modal + `/board/:shareId` + `/look/:id` (main) | Native share sheet + `/share/:shareId` (RSC) | Old URLs 301 |
| Moodboards (`/moodboards`, hidden by `_RB_MB_HIDDEN`) | Not rebuilt (flagged off in legacy) | Revisit as an Ideas type if wanted |
| Email deep links (`?receipts=1`, `?open=&fill=1`, `?new=1&robes=1`, `?from=email`) | Universal links to `/wardrobe/inbox`, `/look/:id?fill=1`, `/look/new?robes=1` | |
| `/admin` | Separate internal app (not in the consumer IA) | Reads job rows (D1) |
| `/terms`, `/privacy` | Marketing site + You › Legal | |

---

## 4. Performance and quality budgets

Measured at p75 unless stated otherwise. Reference devices: **web**, a Moto G Power–class device on "Fast 4G" (Lighthouse mobile) plus a desktop; **native**, a Pixel 6a (Android mid-tier) and an iPhone 12.

### 4.1 Web (Next.js)

| Metric | Budget |
|---|---|
| LCP, Today / Looks / Wardrobe (signed in) | ≤ 2.0s mobile, ≤ 1.2s desktop |
| LCP, share page `/share/:id` and marketing | ≤ 1.5s mobile |
| INP | ≤ 150ms (hard fail at 200ms) |
| CLS | ≤ 0.05 (0 on result surfaces; the skeletons match) |
| TTFB (RSC, cached shell) | ≤ 400ms |
| Route JS (first load, gzip) | ≤ 150 KB app routes; ≤ 90 KB share/marketing; no single route chunk > 60 KB |
| Fonts | ≤ 2 families, subsetted woff2, ≤ 80 KB total, `font-display: swap`, preloaded (legacy: ~490 KB) |
| Images | Cloudinary `f_auto,q_auto` at exact rendered width × DPR; thumbnails ≤ 25 KB, 4:5 frames ≤ 120 KB; blurhash inline |
| Total transfer, first signed-in load | ≤ 600 KB before images (legacy ≈ 2.5 MB) |
| Client navigation (cached) | Paint ≤ 100ms; data-fresh ≤ 500ms |

### 4.2 Native (Expo)

| Metric | Budget |
|---|---|
| Cold start to interactive Today (cached data) | ≤ 1.5s iPhone 12, ≤ 2.0s Pixel 6a |
| Warm start / resume | ≤ 400ms |
| Tab switch / push of a cached detail | ≤ 100ms to first paint, no blank frame |
| Scrolling (wardrobe grid of 300 pieces, look grids) | 60 fps; dropped frames < 1%; FlashList with recycled cells |
| JS bundle (Hermes bytecode) | ≤ 8 MB; OTA update ≤ 3 MB |
| App download size | ≤ 40 MB iOS, ≤ 30 MB Android |
| Memory (wardrobe of 500 pieces) | ≤ 250 MB resident |
| Crash-free sessions / users | ≥ 99.8% / ≥ 99.5% |
| ANR (Android) | < 0.3% |

### 4.3 Generation and capture (both platforms)

| Metric | Budget |
|---|---|
| Submit → result screen visible (skeletons) | ≤ 300ms |
| Submit → stage A text (look names, pieces) | ≤ 3s p50, ≤ 6s p95 |
| Submit → first editorial image | ≤ 25s p50, ≤ 40s p95 |
| Submit → all editorial images, three-way result | ≤ 45s p50, ≤ 75s p95 (legacy: sequential, minutes) |
| Unowned piece still, cache hit | ≤ 300ms |
| Worker state change → client UI (Realtime) | ≤ 1s p95 |
| Job survives: refresh, app kill, deploy | 100% (no in-memory job state anywhere) |
| Shutter → ready for next shot (multi-shot) | ≤ 300ms |
| Photo → piece visible in wardrobe (optimistic, "reading") | ≤ 1s |
| Piece analysis (tags) complete | ≤ 8s p95 |
| Cutout complete (D8) | ≤ 12s p95 |
| Generation success (≥ 1 usable result) | ≥ 99%; full success ≥ 95%; alert when the 15-minute rolling rate < 90% |
| CRUD API (Supabase REST / RPC) | ≤ 250ms p95 in-region |

### 4.4 Quality gates

- WCAG 2.2 AA on every P0 route (axe in CI: zero serious or critical issues). Dynamic Type at the largest non-accessibility size without truncating primary actions.
- Every structured-output schema passes the provider contract test in CI (§D14).
- Lighthouse CI and the bundle budgets block the merge. Native startup is traced on the reference Android in CI weekly.

---

## 5. P0 UX requirements for the rebuild

Acceptance criteria written to be adopted verbatim.

**Generation (D1–D4, D6, D14)**
1. Submitting any generation shows its destination screen, with skeletons in the final layout, within 300ms. No full-screen blocking overlay exists anywhere in the app.
2. The looks' names and piece lists (stage A) are visible within 3s p50 / 6s p95. Owned pieces render from her own photos immediately.
3. Each image appears in its pre-sized 4:5 frame as soon as it completes, without shifting layout (CLS 0 on result screens), and fades in from a stored blurhash.
4. Job and part state reach the client over Supabase Realtime. The client contains no polling loops for generation status.
5. A generation continues and completes if she refreshes, navigates away, closes the tab or kills the app. Reopening the app shows it in the generation tray at its current state.
6. When a generation completes while she is outside its screen, the tray updates, and (native, when backgrounded, if permitted) a push notification deep-links to the result.
7. Cancel stops the job server-side (no further provider calls are made) and returns her to her input with it prefilled.
8. A failed image or look shows in place with a "Try again" for that item only. The other results remain. Her original input is never lost.
9. Editorial images for a three-way result are generated in parallel in priority order (look 1 first). Unowned piece stills are generated only when shown or on save, and served from the shared still cache when a match exists.
10. No generation, analysis or ingest state is held in server process memory.

**Navigation and data (D5, D11, D12, D13)**
11. The app has exactly four primary destinations (Today, Wardrobe, Looks, Plan), one Create action and a You area. Names and routes are identical on web and native.
12. Every detail screen is a URL. Back returns to the previous screen on both platforms. No two screens can overlap.
13. Switching tabs or opening a previously loaded detail paints from cache in ≤ 100ms. Mutations (save, pin, wear, swap, rename, tag) update the UI optimistically and roll back with a toast on failure.
14. All entities use server-minted uuids. Days, trip days and generated ideas are rows, not positions inside JSON blobs. No UI depends on a derived index that can drift from its source.
15. Destructive actions execute immediately with an Undo affordance for ≥ 6s and soft-delete server-side. Only account deletion asks for confirmation.
16. Every email, push and share URL is a universal / app link that opens the exact screen in the app when installed and on the web otherwise. Sharing a look uses the native share sheet with a rendered image card.

**Wardrobe capture (D7, D9)**
17. Native offers a multi-shot capture mode. After each shutter it is ready for the next shot within 300ms, with no per-piece form.
18. She can select ≥ 30 photos from the camera roll in one action. All upload in the background and survive app close.
19. Each captured piece appears in the wardrobe within 1s in a "reading" state and is auto-tagged within 8s p95. High-confidence reads file themselves. Only uncertain reads go to the Inbox.
20. Photos, forwarded receipts, pasted links and shares all arrive through one ingest pipeline, and anything needing review appears in Wardrobe › Inbox with a count on Today.
21. A user with zero or one piece can get a complete styled result, and every styled result distinguishes her pieces from borrowed ones in copy and visuals. (The stand-in starter wardrobe is P0 subject to the founder decision noted in D9.)

**Onboarding (D10)**
22. From first launch, a new user sees a styled result streaming within 60s p50. There are at most two screens between authentication and that result. Nothing asks for information the auth provider already supplied.

**Quality (D15, D16, D22)**
23. All P0 routes meet WCAG 2.2 AA. No text is below 11pt/11px. Every control has a touch target ≥ 44pt/48dp and an accessible name. No action is reachable only by hover.
24. The budgets in section 4 are enforced in CI and a regression blocks the merge.
25. No user-facing string, date, currency, size or unit is hard-coded in a component. All go through the copy registry and `Intl`.

**Carry-overs from the legacy product (keep these; they were earned in testing)**
26. One filled (ink) button per screen, marking the single real commitment. Everything else is a hairline pill or a text door.
27. No lock/unlock language. A threshold is a capability appearing.
28. A Look is its exact piece set. A Wear is immutable. Changing a look with history asks Update / Save as new. Titles are offered, never applied.
29. Error copy is product-voiced. Raw server or provider text never reaches the user.
