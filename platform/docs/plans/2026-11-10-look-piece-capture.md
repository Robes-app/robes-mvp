# Look & Piece Capture (1c, 3c, add a photo to a look)

Status: built 2026-11-10 on `beta`, web + native in the same pass. Owner: Annie.

**Sources.** The PRD *Look & Piece Capture (1c, 3c)* (Annie, 10 Nov 2026, with her answers to its
open questions), the Claude Design canvas *Robes MVP — The front door · mobile*
(`claude.ai/code/artifact/56398d74-fa24-4518-ba0d-1f26dd9a7d82`, frames **1c** "Capture a look"
and **3c** "Wardrobe › Photo") and the prototype *Add a photo to a look* (`AddPhoto.dc.html`).
The PRD wins on behaviour, the canvas on layout, copy and motion. Each frame was walked state by
state in a browser before any code was written.

This plan closes the line the Front Door plan left open (2026-11-09 §8, "Capture's camera flow
beyond today's").

---

## 0. The short version

Three photo flows, one camera.

1. **Capture a look (1c).** Home's Capture opens the camera over Home. Use photo makes a **draft
   look** whose picture is the photograph. Its Rack offers *Find the pieces*; each piece found is a
   row she matches to a piece of hers, adds to her wardrobe, or removes. Save works at any point
   but while the pieces are being found, and whatever is unfiled stays on the look as a suggestion.
2. **Wardrobe › Photo (3c).** The camera stays open between shots. Review is a list (two or more)
   or the piece itself (one); *Add N to wardrobe* files everything left in one go, then the
   wardrobe opens under a toast.
3. **Add a photo to a look (flow 3).** The Edit look drawer's picture is the photo strip. Its Add a
   photo card opens the same camera with piece reading off; *Add to look* stages the photograph
   and *Update look* (or the tick) keeps it.

## 1. Rulings

Where the PRD, the code or an earlier decision pull apart. A line from Annie flips any of them.

| # | Question | Ruling |
|---|---|---|
| C1 | The PRD ships detection as a mock. | **The real reader** (Annie, 10 Nov): the `wardrobe_pieces` job that today's photo flows already use. It finds every piece, crops it and names the piece of hers it looks like. The offline fake stands in for it in tests, as before. |
| C2 | Background removal on a new piece's image. | **Crop now, removal next** (Annie, 10 Nov). The crop is the read's own. Removal is a new paid service and its own change. |
| C3 | Where does an unfiled piece live? | **On the look's rack, as a proposal that carries its read** (`Proposal.capture`: the read, the piece's index, its crop, its material, the piece of hers it looks like). No new table. Saving never files it to her wardrobe or wishlist (`fileProposals` skips it), and it does not make the look "composed by Robes". |
| C4 | How is a look from a photograph told apart? | **`looks.source = 'capture'`** (migration `20261110120000`, a widened check). It hides the prompt card and Generate on the draft, skips drawing a picture on Save, and saves under today's date like a hand-built look. |
| C5 | Changing a saved row (PRD open question). | **It is an ordinary piece row once filed** (Annie): it comes off the look in edit-pieces mode like any other. A piece added to her wardrobe stays there. |
| C6 | Undo scope on The Rack. | **Undo restores every removed row**, each where it stood (the prototype's behaviour; the PRD left it open). |
| C7 | Discard. | **Asks only when something was found, filed, removed or added**; a photograph she has done nothing with closes straight away. |
| C8 | Match sheet. | **The suggested piece is pre-ticked** (Annie). The sheet is the one `PiecePicker`, in a new `match` mode. |
| C9 | Multi-shot cap. | **Twelve photographs a sitting** (`REVIEW_MAX`, as before): each is read on its own and reads are limited to 20 a minute. At twelve the shutter stands down and the hint says so. |
| C10 | One photo, several pieces. | The real reader can find more than one piece in a photograph. **The camera counts photographs; Review lists pieces.** |
| C11 | Paste URL and From receipt. | **Left working**, as built in the Front Door pass. The PRD greys them only for its own prototype. |
| C12 | "Detecting…" in the single review. | Rows read **"Reading…"** while Robes reads, the app's existing word for it on every piece row. |
| C13 | The Edit look drawer's tick. | **Disabled until something changes, then it is Update look** (PRD 3.1, 3.5). This replaces D18's "the tick closes while nothing waits"; × leaves. |
| C14 | The sparkle on Robes' card. | **Bottom-right**, as the PRD says (the prototype draws it bottom-left). |
| C15 | The old photo-look screen. | **Retired** (`LookFromPhoto`, `/looks/new/photo`). `POST /wardrobe/photo-reads/:id/look` stays for phone builds from before this change. |

## 2. What was built

File paths are `app/src/…` with the native twin in brackets.

**Shared**
- `@robes/core/looks/capture.ts`: the capture rack, pure and tested: rows from a read, the stage
  (`ask · photo · finding · failed · rack · clear`), file, remove, restore.
- `@robes/core/add-flow`: `reviewScreen` (list, single, piece k of n, camera) and `bulkGroups`
  (one filing call per read, kept pieces with her edits, removed ones skipped).
- Contracts: `Proposal.capture`, `Look.captureImages`, `CreateLookInput.photoAssetId`,
  `FilePieceInput`; routes `looks.findPieces` and `photoReads.piece`.
- Copy: `lookbook.draftLook.capture`, `lookbook.savedLook.manager.camera`, `wardrobe.capture`.

**Server**
- `POST /looks` takes `photoAssetId` (her own `look_photo`, else 404) and makes a `capture` draft.
- `POST /looks/:id/pieces/find` reads the look's front photograph (the photo-read gate and limits).
- `POST /wardrobe/photo-reads/:id/pieces` files one piece of a read, once, with her edits.

**Screens**
- The camera's parts: `components/capture/camera-parts.tsx` [`features/capture/CameraParts.tsx`].
- One photograph: `components/capture/capture-camera.tsx` [`features/capture/CaptureCamera.tsx`],
  with the review as discs (a look) or pills (a photo added to a look).
- Several photographs: `components/wardrobe/camera.tsx` [`features/wardrobe/Camera.tsx`].
- Capture a look: `components/capture/look-capture.tsx` [`features/capture/LookCapture.tsx`],
  `lib/capture-rack.ts` [`features/looks/capture-rack.ts`], `components/looks/capture-rack.tsx`
  [`features/looks/CaptureRack.tsx`], inside `DraftLook`.
- Review: `components/wardrobe/add/review.tsx` [`features/wardrobe/add/Review.tsx`].
- The photo strip: `components/looks/image-manager.tsx` [`features/looks/ImageManager.tsx`].

## 3. Not in this pass

- Background removal (C2).
- The "Images of this piece" stack on the new-piece review (PRD 1c.8): there is no piece to hold a
  second image until it is filed. Her photographs of a piece are added from its own page.
- A real detection or segmentation model beyond the reader in place.

## 4. Checks

Unit tests cover the rack reducer, the review reducer, the new server functions and the
repository's save. End-to-end specs: `app/e2e/capture-look.spec.ts`, `photo-pieces.spec.ts`,
`looks-saved-ui.spec.ts`. The camera itself needs a device: a headless browser has none, which is
the PRD's "camera denied" path, and that path is what the specs walk.
