# Piece cutouts: lifting each piece cleanly out of her photo (product and engineering brief)

**Date**: 2026-11-21 · **Branch**: `beta` · **Status**: step 1 (research) done; step 2 (try-out) not started; nothing built
**For**: Annie. Plain language first; file references are in brackets or in "Where in the code" at the end.
**Sources**: the research report, [Garment cutout model options](../reports/Garment%20cutout%20model%20options.md) (this brief links to it and does not repeat it); the code notes, [current pipeline in the repo](../research_notes/Garment%20cutout%20model%20options/current_pipeline_in_repo.md); PR #242.

## Summary

1. Today Robes finds each piece in a photo and cuts a plain rectangle around it. Nothing removes the background, so a piece keeps the bed, the floor and sometimes her. The same rectangle is what the look-drawing step is shown.
2. The research found that a "cutout" is two jobs: **choosing** the right piece and **tracing** its edge. No single tool does both well, so the likely answer is a route per kind of photo, not one vendor.
3. Cost will not decide it. The options run from free (on the iPhone) to about two cents a piece. Licence is the sharper filter, and it reopens the earlier plan (D8, BiRefNet).
4. Nobody has published a test of these tools on clothes, and almost every price is unconfirmed. The try-out on the team's own photos is the real evidence, and it should also test whether clean cutouts stop stray clothes appearing in drawn looks.
5. Four steps: research (done), try-out, build on the platform (web and native together), then the "defining detail" follow-up from PR #242. Nine decisions for Annie are listed in section 9.

## 1. What exists today

**How a photo becomes pieces.** Both apps send the photo to Gemini once. Gemini returns up to eight pieces and, for each, a **box**: four numbers saying where the piece sits in the photo.

- **The platform (the rebuild)** runs this as a background job (`wardrobe_pieces`, prompt version 3, on `gemini-3.8-flash`). The server cuts a rectangle for each box and stores it as that piece's own image. The original photo is kept.
- **The legacy app (beta.byrobes.com)** calls `POST /api/wardrobe/pieces` on `gemini-2.5-flash`. The browser cuts the rectangle and uploads it to Cloudinary.

**The rectangle.** Both apps use one rule: the box plus 8% of the *whole photo* on every side, never smaller than 28% of the photo on a side. For a small item in a full-length photo (shoes, a bag) that takes in neighbouring clothes, her body and the room. A photo with one piece keeps the whole photograph.

**No background removal exists**, in either app.

**Unused scaffolding on the platform.** Places were reserved for a cutout and never wired up: a `cutout` job type, a `cutout_asset_id` column on the piece, a `has_cutout` flag on the image, a storage name for `cutout.png` or `cutout.webp`, and a slot for a fal API key. No code runs any of it. The column and the flag are two different storage designs; the build has to choose one.

**The earlier plan, D8** (24 September 2026): BiRefNet, an open cutout model, hosted on fal, with Photoroom as the quality fallback, stored once per piece, finished within 12 seconds for 95% of pieces. It assumed one piece per photo, because Robes could not yet find several.

**What the look-drawing step is shown.** When Robes draws a look, it sends each owned piece's stored picture to the image model as a numbered reference, up to nine. That picture is the rectangle, with everything in it. PR #242 (merged 21 November) changed the wording to "take ONLY this garment from that photograph", but nothing is removed from the picture. PR #242 marks leftover clothes in the photo as an **inferred** cause of stray garments, not a proven one.

## 2. The goal, and what is out of scope

**Goal.** Each piece is stored once as a clean cutout: the piece alone, on a see-through background, true to the photograph. It is used on her wardrobe card and as the reference when a look is drawn.

**Requirements (Annie's cost principles).**

1. **No image-generating model for cutouts.** Specialist cutout models are cheaper and cannot invent details. A generator can redraw a button or a neckline: the same faithfulness problem as the V-neck in PR #242.
2. **Reuse the boxes Gemini already finds.** Detection is not paid for twice.
3. **Cut out once, at upload, and store the result.** Never per look.
4. **Record the cost per piece in the existing cost ledger from day one.**
5. **On the iPhone, cut out on the device where possible.** It is free and iOS native is the priority. The web may lag.
6. **A bad or failed cutout quietly falls back to today's rectangle.** No error, no message. The rectangle is always kept beside the cutout, because a cutout can fail in a way a rectangle cannot: by dropping a sleeve.

**Not in scope.**

- Filling in parts of a garment hidden by another piece. Only a generator can (requirement 1).
- The legacy app. Its database is frozen, so it keeps the rectangle.
- Choosing the vendor. The try-out decides.
- Redesigning the wardrobe card or the look screen.

## 3. The hard cases

The report's central finding: **"cutout" is two jobs.** *Choosing* is deciding which pixels belong to this piece and not to the jacket over it or the person wearing it. *Tracing* is drawing a clean edge, including soft edges where fabric is half see-through. Each family of tool is good at one:

- **Background removers** (Photoroom, Bria, BiRefNet, Apple's subject lifting) trace well, but keep whatever stands out. Given a worn outfit they return the whole person.
- **Box-prompted segmenters** (the SAM family; iOS 27's prompted segmentation) can be told "this piece, here" using Robes' box, but draw a hard, coarse edge.

Every line below is an expectation. **No source measured any of them on clothes.** The last three rows are not in the report's table; they are this brief's reading of its reasoning.

| Hard case | Why it is hard | Job | Expected to cope |
|---|---|---|---|
| Sheer, lace, mesh | A pixel is half fabric, half background; a yes/no edge looks jagged or solid | Tracing | A soft-edge background remover (BiRefNet's matting variant, Photoroom). Bria's edge is near yes/no; SAM is poor |
| Black on black | The tool cannot tell what the subject is; every background remover fails on the same photos | Choosing | Nothing reliably. The box helps a prompted model look in the right place |
| On a hanger | The hanger is attached, so it counts as the subject | Choosing | None cleanly. A prompted model may need an extra hint |
| Mirror selfie | Background removers return the whole person and the phone | Choosing | Box-prompted segmenters; iOS 27, to be proven |
| One garment off a worn outfit | Layered pieces blur into one; covered parts leave holes | Choosing | Box-prompted segmenters only. Holes stay |
| Overlapping flat lay | Touching pieces merge; today's padded rectangle pulls neighbours in | Choosing | A box-prompted segmenter and a tighter crop. Apple's lifting will probably merge them |
| Thin straps | A coarse mask loses fine structure; a dropped strap is a missing part | Tracing | A soft-edge background remover. SAM is documented as weak on intricate shapes |
| Pale on pale | Low contrast, as black on black; pale halos are invisible on white | Both | Uncertain. Judge on grey, not white |

This points to a **pairing**: a prompted model picks the piece, a background remover finishes the edge inside it, and the rectangle is the fallback. Nobody has measured that pairing on clothes.

## 4. The cost questions

**Every vendor price below is a search-summary reading from 21 November 2026 and unconfirmed**: the researchers could not open vendor pricing pages. Confirm each on the live page before budgeting.

"A typical wardrobe" is **my assumption: 100 pieces from 40 photos**. The real number of pieces per photo is unknown and is one thing the try-out measures.

| Option | Price | Status | 100-piece wardrobe |
|---|---|---|---|
| On-device iPhone (Apple) | $0 | Researcher's reading of Apple's pages | $0 |
| BiRefNet, self-hosted | about $0.0002–$0.001 a piece | Researcher's arithmetic; timings unsourced | $0.02–$0.10 |
| BiRefNet on fal | about $0.001–$0.0025 a piece | Derived from a disputed per-second rate | $0.10–$0.25 |
| Hosted SAM 3 | $0.0025 an image (Meta), $0.005 a request (fal) | Search summary | $0.10–$0.20 if billed per photo; $0.25–$0.50 if per piece |
| Bria RMBG-2.0 | $0.018 a piece | Search summary | $1.80 |
| Photoroom | $0.02 a piece ($0.01 on a partner plan near 100k a month) | Search summary | $2.00 |

Dearer and not shortlisted: Cloudinary (about $0.03, unverified), Pixelcut ($0.05) and Leonardo.Ai, formerly remove.bg ($0.1047).

For scale: one drawn look image costs Robes $0.067 (read from the code, verified). At two cents a piece, a whole wardrobe costs about the same as thirty look images, once.

**Still to confirm with a live call.**

- Whether a SAM 3 request carrying several boxes is billed per photo or per piece. Per photo is an inference from a mirrored copy of fal's documentation.
- fal's real price for BiRefNet. fal's own pages disagree.
- Time per piece for every option, including a cold start (the first call after a pause), and on a mid-range iPhone. No figures were found. D8's target is 12 seconds.

**How the ledger records it.** The platform's cost ledger (the table of every paid model call) already fits a call that is not Gemini: one row per cutout, with a new feature name such as `wardrobe.cutout`, the model, one image, the time taken and the cost. A new provider needs its own daily budget line, or it falls under a $10-a-day default. Where a vendor bills by the second, the cost comes from the measured time. An on-device cutout could be a zero-cost row, so the ledger shows how many pieces took the free route; that is a build choice. The legacy log has no cost column and cannot gain one.

## 5. The licence check

A model can carry terms at three layers: the code, the trained model (its "weights"), and the pictures it was trained on.

| Option | Licence | Commercial use | What is unverified |
|---|---|---|---|
| Apple on-device | Part of iOS | Yes, on the researcher's reading | Apple's terms not read in full. One clause, quoted second-hand, bars using the output to train another model |
| SAM 2 / 2.1 | Apache-2.0 | Yes | Nothing material; read directly |
| SAM 3 / 3.1 | Meta's "SAM License" | Yes on its face | Meta may change the terms; bars military and similar uses; the host's terms not read |
| Bria RMBG-2.0 | Downloadable model is non-commercial (CC BY-NC 4.0) | **No** if we run it ourselves; **yes** through Bria's paid API or its fal listing | The price; Bria's direct licence price is not public |
| BiRefNet | MIT | **Unclear** | See below |
| Photoroom | Commercial API | Yes | Whether photos sent through the API train Photoroom's models; its pages disagree |

The report also rules out ZIM, FastSAM, the SegFormer clothes models, BEN2 and the `rembg` library's default model on licence.

**BiRefNet matters most, because D8 is built on it.** Its label says MIT, and its author says the code and model may be used under MIT. But it was trained on a picture set (DIS5K) whose terms, read via search, allow research and education only and forbid commercial use. Asked on 16 November 2026 whether permission was obtained or a clean version exists, the author answered: "No, and it's almost impossible to do that." Whether a restriction on training pictures binds the model is legally unsettled, and Cloudflare ships BiRefNet commercially, so the risk is unquantified, not proven. Calling it through fal does not obviously change this. Bria is the same model design trained on licensed pictures: at 10,000 pieces a month, about $180 against roughly $10–$25.

**This reopens D8, and it is not decided here.** It is Annie's decision, ideally after a legal read. The try-out can still run BiRefNet, so the quality difference is known when she decides.

## 6. The try-out (step 2)

**Shortlist, from the report.** Today's rectangle is the control.

1. **Apple subject lifting**, picking the item under Robes' box (iOS 17 and later). Free; for flat lays and hangers.
2. **iOS 27 prompted segmentation**, started from the centre of the box. Free; for worn pieces.
3. **Hosted box-prompted SAM** (SAM 3, with SAM 2.1 as the Apache-licensed reference), all boxes in one call. The server route for worn pieces and for web.
4. **Bria RMBG-2.0** on the box crop. The licensed edge model.
5. **BiRefNet on fal**, standard and soft-edge variants. The D8 plan.

Photoroom runs alongside as the yardstick the resale platforms chose, not as a sixth contender.

**The report's leaning**, not a decision: the iPhone makes a free first attempt, a paid server route sits behind it for worn pieces and for web, and the rectangle is the fallback.

**The photo set.** 80 to 100 photos spread across the eight hard cases (about ten each), plus 20 to 30 easy ones. The size is the researchers' judgement. All from the team's own wardrobes, taken the way testers take them, and each run through today's read first so the boxes are real.

**Privacy.** These are real bedroom and mirror photos going to outside companies. Use only photos whose owner has agreed, and none from testers. Check each vendor's retention and training terms first; Photoroom's must be settled in writing before anything is sent. The on-device candidates send nothing. A vendor chosen later is a new processor of her photos and goes in the platform's data inventory.

**Scoring.** A person judges blind: results side by side, names hidden, order shuffled, the rectangle among them. Each cutout is *usable*, *usable with fallback* or *unusable*; any missing part of the garment fails outright. Judged on white and again on mid-grey, because white hides pale halos. Reported per hard case, never as one average. Time and cost per piece are logged for every call.

**What winning means.** Not one winner: a route for each kind of photo. A candidate earns a route if it clearly beats the rectangle on that kind of photo, rarely loses part of a garment, stays inside 12 seconds, and passes the licence decision. Annie sets the pass mark before the results are opened. The most useful single output is the share of real photos that are worn versus laid flat, because it shows which route carries the feature.

**Extra checks from the report.**

- **Tight versus padded crop.** Run candidates 4 and 5 on a tight box as well as today's padded rectangle.
- **The pairing.** On worn photos, let candidate 3's choice limit where candidate 4 or 5 keeps pixels.
- **Spotting a failed cutout automatically** (its size against the box, stray islands). Untested on clothes.
- **Does a clean cutout reduce stray garments in drawn looks?** This is the claim to test, since PR #242 only inferred the cause. Draw the same looks twice with the same words, once from rectangles and once from clean cutouts, and count garments that were not chosen. Twenty looks both ways cost about $2.70 at $0.067 a picture.

**What Annie needs to supply.**

- The photos, with each owner's agreement.
- An iPhone on iOS 27 for candidates 1 and 2, and ideally an older mid-range iPhone. Neither candidate runs in the simulator; both need a small throwaway test app.
- Accounts and keys: fal (candidates 3, 4, 5), Photoroom, and optionally Meta's SAM 3 access.
- A few hours to judge, or a named judge.

**Cost.** At roughly 300 pieces the dearest candidate is about $6, and all of them together should stay under about $20. That is an estimate from assumed counts.

## 6a. What Alta does (from Annie's screenshots, 21 Nov)

Read from nine screenshots of Alta's app taking one mirror selfie. Nothing here comes from Alta's own documentation.

**Alta runs two steps, and only the second is drawn.**

1. **A real cutout, stored by default.** The piece page for the trainers shows a true cutout of her foot: jagged, blurred, with the trouser hem still attached. It is rough because trainers in a full-length photo are only a small patch of pixels. No cutout tool can add detail that the photo does not hold.
2. **"Prettify", a drawn product shot.** An image generator redraws the piece as a clean catalogue picture. It is offered in the add flow and again later on the piece page.

**How Prettify handles the risk of drawing the wrong thing.** On the piece page it draws two versions and asks "Which looks more like yours?", with her original crop shown above for comparison, hold-to-zoom, and Regenerate. In the add flow each piece has Retry and an arrow back to the original crop. She is the judge of faithfulness; Alta does not claim the drawing is right.

**It still invents.** In the same selfie, cream trainers with dark stripes were first drawn as plain white with white stripes. A fitted taupe T-shirt, half hidden by her hand and phone with sunglasses at the neck, came back as a complete, boxier camel tee. The two trainer options offered later differ from each other in stripes and toe. The cap and sunglasses were not found at all.

It invents even from a good photo. A sharp, close, top-down photo of flat suede trainers with a thin gum sole came back as a chunkier runner with a thick white midsole and a raised heel: a different shoe.

**What makes the flow feel good, and works with any method.**

- One photo becomes several named pieces. Names and categories appear before the images.
- Pieces resolve one at a time over the rough crop, so she watches progress.
- Each piece has its own Add, Retry, delete, rename and revert. The top button counts what is ready.

**What this changes for Robes.**

- A cutout cannot give Alta's finish from a worn photo. It keeps only the pixels that exist: the worn shape, a gap where a hand was, and blur on small items. Flat lays and hangers cut out cleanly.
- Requirement 1 in section 2 ("no image-generating model for cutouts") stands, and Annie has extended it (decision 10): no drawn replacement of a piece's image at all. Faithfulness to the piece is the point of difference from Alta.
- The look itself is still drawn, so faithfulness there depends on what the drawing step is given. Liberty's example shows it: a coat whose strong shoulder and belt are its whole character was drawn as a soft-shouldered trench with lapels and no belt. A clean cutout of the coat alone (without the model's face, jumper and boots) plus the defining detail in section 8 are the two fixes, and that coat photo belongs in the try-out.
- The try-out should also include a full-length selfie with small items (shoes, bag, cap) to see how rough the cutouts are at that size.

## 7. The build (step 3): scope, not design

A separate conversation designs and builds it, with tests, on web and native together. This is platform work only: the legacy database is frozen. It would touch:

- **The job.** The reserved `cutout` job type gets a handler that runs after the read, reuses the boxes, and falls back quietly. The model layer knows only Gemini today, so the vendor needs an adapter.
- **Storage.** Today's stored image (`master.jpg`) is flattened onto white and cannot hold transparency, so the cutout needs its own file. Keep one of the two unwired scaffolds and delete the other.
- **What the look-drawing step is shown.** Two places load each piece's picture, plus the key piece. Whether they switch to the cutout depends on the stray-garment check.
- **The ledger.** A new feature and provider family, and a daily budget line.
- **Screens.** The piece card and tile on web and native, in one pass.
- **iPhone on-device.** A development build and a small Swift module of our own; the open-source wrappers do not expose what is needed.
- **Tests and docs.** Tests beside the code; the new processor in the data inventory; the D8 docs corrected (some still say extracting pieces from an outfit photo is "deliberately not built").
- **A new prompt version, as usual,** if the read itself changes. Step 4 changes it.

## 8. The defining detail (step 4)

**What PR #242 left open.** PR #242 passes each piece's stored shape words into the look and drawing prompts. But the read only asks for generic words ("Blazer, Single-breasted, Relaxed"), so the feature that makes a piece what it is, such as the padded, extended shoulder of the Camilla and Marc coat, may never have been written down. The follow-up: when a piece is read, also ask for its **one defining detail**, in the same call, once.

**Where it would live.** In the piece's existing bundle of read details (`item_dna`), beside the shape words. No database change is needed unless it must be filterable. PR #242 already built the path from that bundle into both prompts.

**Prompt versions that bump together.** The single-piece and multi-piece reads share one set of field rules, so they move as a pair: `wardrobe-analyse` v5 to v6 and `wardrobe-pieces` v3 to v4, with the two lines that select the current versions, the tests that pin them, and the data inventory. If the look and drawing prompts word the detail differently from the shape words, they take a new version too. The platform docs require evaluation runs before a prompt change, but no evaluation set was found in the repo; the build should settle that.

**Re-reading existing wardrobes.** There is no bulk re-read today; the only re-read is "Try again" on a piece whose read failed. A re-read is new work with two rules:

- **It must not overwrite what she has edited.** The normal read writes category, colour and print over what is stored. A re-read for one new field needs a narrow write that only adds the detail.
- **It runs as a system job,** not through her daily photo allowance, and inside that model's daily budget.

**The cost question.** The price of one re-read is unknown here. The ledger holds the true cost of every read so far, so the answer is that figure multiplied by the number of pieces with a usable photo; look both up before committing. The half-price overnight batch route does not accept images today. Whether pieces brought over from legacy have a photo the platform can re-read is unconfirmed.

Step 4 does not depend on cutouts and could ship first.

## 9. Open decisions for Annie

1. **BiRefNet's licence.** Accept the training-data risk knowingly, pay about ten times more for Bria's licensed model, or drop BiRefNet. And whether to get a legal read before deciding.
2. **Which photos, to which companies.** Whose photos may be used in the try-out, and which outside vendors may receive them. Photoroom only once its training terms are settled in writing.
3. **The pass mark.** What share of "usable" results earns a route, set before results are opened, and who judges.
4. **iPhone first. Decided by Annie, 21 Nov: yes.** iPhone on-device cutout (Apple subject lifting, candidate 1) leads for flat lays; web lags and keeps the rectangle until a server route exists. Her own test in Photos on a ribbed knit vest gave a clean result: both straps, the gap between them and the knit texture intact. One photo is not the try-out: touching pieces, pale-on-pale, dark-on-dark, hangers and sheer fabric still need checking, and worn pieces need a different route (iOS 27 or a server). Still open: whether it is acceptable that worn pieces are only free on iOS 27.
5. **Where the cutout shows.** On her wardrobe card straight away, or first only as the reference for drawn looks.
6. **Existing wardrobes.** Cut out pieces already filed, or only new ones.
7. **The defining detail.** Whether she sees and can edit it, or it works silently; and whether existing wardrobes are re-read all at once or gradually.
8. **Order.** Whether step 4 ships before the cutout build, since it does not depend on it.
9. **Spend ceilings.** A daily budget for the cutout provider and a one-off budget for the re-read.
10. **Polish for worn and small pieces (section 6a). Decided by Annie, 21 Nov: no redrawing.** A piece's image is always her own photograph of it, cut out. Robes never replaces it with a drawn version, optional or not, because a redraw loses the quality and style notes of the piece (Liberty's strong-shoulder report is the same failure). What stays open is how to make rough cutouts acceptable: steering her towards flat lay, hanger and close-up photos for small items, and the pass mark in decision 3.

## 10. Time-sensitive notes

- **`gemini-2.5-flash` is reported to shut down or be rerouted on 1 December 2026. Unverified**: secondary sources with conflicting dates. The platform reads photos on `gemini-3.8-flash` and is not affected, but the legacy app's photo-read routes name `gemini-2.5-flash`. Worth checking on Google's deprecations page this week, whatever happens with cutouts.
- **remove.bg's self-service API stops on 1 December 2026** and moves to Leonardo.Ai at about $0.10 an image (search summary). It is not on the shortlist.
- **Gemini's own masks are not a route**: sources conflict on whether newer Gemini models support them. The boxes are the reusable part.
- **fal lists an "RMBG-3.0".** Confirm it is not a generative model before testing it.
- **PR #242 reaches testers only after a sync to `main` and a production worker deploy.** The stray-garment check needs that in place first.

## Where in the code

- Multi-piece read, platform: `platform/packages/jobs/src/handlers/wardrobe-pieces.ts:36-109`; prompt `platform/packages/ai/src/prompts/wardrobe-pieces/v3.ts`; model map `platform/packages/ai/src/models.ts:49-65`.
- Single-piece read: `platform/packages/jobs/src/handlers/wardrobe-analyse.ts:26-99`; prompt `platform/packages/ai/src/prompts/wardrobe-analyse/v5.ts`.
- Current prompt versions: `platform/packages/ai/package.json:7-17`.
- Box and crop rule: `platform/packages/core/src/photo-pieces/index.ts:12-107`; the cut `platform/packages/media/src/render.ts:115-127` and `process.ts:85-90`; flattened master `render.ts:45-60`.
- Unwired cutout scaffolding: `platform/packages/media/src/keys.ts:25-26`; `platform/db/migrations/20260924000500_wardrobe.sql:38`; `20260924000400_assets.sql:19`; `platform/packages/core/src/jobs/index.ts:16`; `platform/infra/src/stacks/secrets-stack.ts:23`.
- D8 plan: `platform/docs/infrastructure.md:120`; `platform/docs/reference/cost-research.md` section 3; `platform/docs/reference/ux-opportunities.md:41, 82, 165-167, 380`.
- What the drawing step loads: `platform/packages/jobs/src/handlers/look-render.ts:252-289, 471-473`; `look-frame.ts:185-212`; wording `platform/packages/ai/src/prompts/garments.ts`.
- Ledger and budget: `platform/packages/db/src/repos/ledger.ts:5-75`; `platform/packages/core/src/budget/index.ts:1-14`.
- Read fields and the write a re-read must not reuse: `platform/packages/ai/src/prompts/wardrobe-analyse/v1.ts:31-131`; `platform/packages/db/src/repos/piece-analysis.ts:39-71`; "Try again" `platform/app/src/server/wardrobe.ts:138-164`.
- Legacy: `server.js:3611` (pieces), `server.js:3521` (analyse); browser crop `public/js/dashboard-personalize.js:1505-1541`.
