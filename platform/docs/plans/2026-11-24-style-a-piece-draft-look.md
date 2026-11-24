# Style a piece → draft look (handoff, Annie 24 Nov)

One owned piece, an optional line of words, one draft look built around it in the existing
`DraftLook`. No three looks, no deck, nothing new inside the draft look but one rule (D4).
Web and native ship in the same pass (twins named in comments).

## What is reused as is
- `looks.prompt` with `draft: true` makes ONE draft in the job; `DraftLook` follows the job and
  opens the look from `output.lookIds` with "Dressing it…".
- `pieceIds` (the prompt box's "around" pieces) already puts a piece on the rack when the model
  leaves it out (`specFromWay`, `aroundIds`).
- `StylingCard` + `PromptDock` (web) / `DockSheet` (iOS): labelled Wardrobe and Shop pills,
  `toggleSource` keeps one on.
- `/piece/[id]` is owned pieces only (wishes have their own page). The rack carries no anchor
  marker (handoff decision 1).

## Decisions (Annie, 24 Nov)
- D1. **No retry.** A look missing the anchor gets it inserted (today's behaviour). The piece's
  photo now rides the styling call and the piece is named as required, so misses are rare.
- D2. **Save: one-line toast "Saved to your lookbook" (`lookbook.saved`), then back to the
  piece.** No two-line card.
- D3. **The old door stays for now:** Create › Style a piece (three ways) and the piece page's
  "Robes suggested" rail are untouched; retiring them is a follow-up.
- D4. **The anchor is locked to words:** `looks.ask` keeps it (KEEP); only Edit removes it.
  It is left out of the "Which piece?" chips, so she is never offered a chip that cannot work.
- D5. Empty send: "Style my {name}", first letter lower-cased only (brand names keep capitals).
- D6. × keeps today's dialog (Discard · Keep editing · Keep for later), then back to the piece.
  × while it is still dressing behaves as New look: the job's draft lands in In progress.
- D7. Analytics reuse the catalogue: `prompt_submitted` gains `surface: 'piece'`; `look_created`
  already carries `anchored`; one new event, `piece_style_opened`.

## Tasks
1. **Contract + job** (`packages/contracts/src/looks.ts`, `packages/jobs/src/handlers/style-piece.ts`;
   read `docs/api-security.md` first). `PromptLookInput.anchorPieceId` (uuid, optional). The job
   loads it as hers (`styling.anchorPiece`, SEC-16), must be ready and owned, else `not_found`;
   sends its photo; sets `anchorPieceId` on the minted draft; keeps it through `fallback`.
   Prompt text change → style-piece v10 with evals. Tests: anchored draft, missing-anchor insert,
   fallback keeps it, another user's piece is `not_found`.
2. **Iterations pinned.** Tests that `looks.ask` (typed, reasons) and `looks.restyle` keep the
   anchor on a prompt-made draft. D4's chip filter in `@robes/core/looks` (`Answers`), tested.
3. **Copy** (`@robes/copy`): sparkle label "Style this piece" (exists), placeholder
   "Style it for…", `defaultPrompt(name)`, chip sub-label "{Category} · {Brand}".
4. **Piece chip** as a slot on `StylingCard` (web `styling-card.tsx`, native `StylingCard.tsx`):
   thumb 40×50 through `pieceSources`/`pieceSource`, serif name, sub-label, round × closes.
   Tokens only; `UNRECORDED` on the thumbnail.
5. **Piece page** (web `piece/[id]/piece-detail.tsx`, native `features/wardrobe/PieceDetail.tsx`):
   the 54pt ink sparkle bottom-right, only when `status === 'ready'`, hidden while any sheet,
   dialog or the dock is open (iOS: through a yield like `useDockYield`). Send → `looks.prompt`
   `{ prompt, draft: true, anchorPieceId, pieceIds: [id], balance }` → open the draft drawer
   following that job. Her words reach the thread through client state, never the URL.
   Offline/failed send: the standard error, nothing created, words kept.
6. **Piece origin** (like `day-origin.ts`): on a draft started from a piece, Save → toast → back to
   `/piece/:id`; × (after its dialog) → back to the piece.
7. **Analytics** (`packages/analytics/src/events.ts`): D7; `docs/data-inventory.md` if a field is new.
8. **Verify:** `pnpm verify`; web e2e for the flow (open, send empty, send typed, save → piece,
   × → piece); native jest for PieceDetail; screenshots against `screens/01–06`.
9. **Launch:** PR into `beta` → staging web. iOS has no OTA updates: a TestFlight build, then on a
   device check the keyboard lifts the bar and the safe area holds.

## Acceptance (handoff §8)
Owned piece shows the sparkle; wishes don't · bar opens with chip, both sources on · both can't be
off · send (button or Return) opens the draft dressing, with or without words · every look in the
draft carries the anchor unless she removes it in Edit · draft look otherwise unchanged · ✓ saves
with "Saved to your lookbook" and returns to the piece · no marker on the anchor · × returns to the
piece · no "AI" in any string · iOS safe area and keyboard, staging web.
