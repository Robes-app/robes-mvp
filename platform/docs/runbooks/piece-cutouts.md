# Piece cutouts and the defining detail

Built 2026-11-21 from `docs/piece-cutout-brief.md` (repo root). What it does, how to test it on
an iPhone, and how to run the one-off re-read. Written for whoever runs Claude from this folder.

## In plain words

- **A cutout** is a piece lifted out of her own photograph, on a see-through ground. It is never
  drawn or filled in. Her iPhone does the lifting (Apple's subject lifting, iOS 17 and later):
  it is free and the photo goes nowhere new.
- **The rectangle is always kept.** A cutout sits beside it. If there is no cutout, or the cutout
  fails a check, the piece shows its rectangle exactly as before, and nothing is said.
- **Web lags.** A photo added on the web has no lift, so its pieces keep the rectangle. The web
  shows a cutout wherever one exists.
- **Worn pieces keep the rectangle.** A person lifts as one item, so a piece the read sees on a
  person is never cut out.
- **The defining detail** is the one feature that makes a piece itself ("Strong padded
  shoulder"). Robes reads it with the piece; she sees it on the piece page (PIECE tab, Detail)
  and can change or clear it. Drawn looks are told to keep it.

## How it runs

1. On the phone, `uploadPhoto(..., { lift: true })` (`mobile/src/features/wardrobe/add-pieces.ts`)
   lifts the photo while it uploads (`mobile/modules/robes-lift`, Swift) and sends the lift
   beside it (`POST /uploads/:id/lift`). It waits at most 4 seconds for the lift.
2. `POST /wardrobe/photo-reads` sees the lift and tells the read job. The read (wardrobe-pieces
   v4) returns each piece's box, whether it is worn, and its defining detail.
3. The job leaves a plan on each crop that may be cut. The rendition worker renders the
   rectangle as before, then cuts the piece (`packages/media/src/cutout.ts`) using the rules in
   `packages/core/src/cutout`: clip a lifted item to its box, split one that covers two boxes,
   and keep the rectangle when a check fails.
4. Every cutout tried is a row in `app.generation_calls`, feature `wardrobe.cutout`: `ok` when
   stored, `partial` with `detail.reason` when the rectangle was kept. On-device ones cost 0.
5. A drawn look is shown the cutout on white where one exists (`packages/jobs/src/piece-photo.ts`).
6. **A single photo of one piece** (Home's add, onboarding's pieces) has no boxes and no crop:
   the photo is the piece's picture. The phone lifts it the same way; once the read says the
   piece is not worn, the job copies the photo's master to `uploads/…/cut` (a cut request), and
   the rendition worker cuts everything that was lifted in the frame and marks the photo
   (`processCut`, `assets.markCutout`).

## The checks, and their numbers

`CUTOUT_RULES` in `packages/core/src/cutout/index.ts`. They were set from three photos and are
guesses until they have met real wardrobes. Up to a quarter of a lifted item may lie outside its
box and be clipped away (`minInside: 0.75`, Annie 22 Nov; it started at 15%); past that the
rectangle is kept. A sliver of the surface between two touching pieces staying on is fine. To tune them, look at the ledger first:

```sql
select detail ->> 'reason' as reason, count(*)
from app.generation_calls
where feature = 'wardrobe.cutout' and created_at > now() - interval '14 days'
group by 1 order by 2 desc;
```

`outside` high: boxes run tight, raise `pad` or lower `minInside`. `miss` high: the lift finds
nothing where the box is (pale on pale, dark on dark). `split` high: touching pieces whose boxes
leave part of the lift uncovered.

## Testing on an iPhone (it cannot be tested anywhere else)

The lifting module does not exist in Expo Go, does not run in the Simulator, and cannot run in a
cloud session. Until these steps have been done on a phone, the native path is unverified.

1. Build and install a build that contains the module (it is native code, so an over-the-air
   update is not enough): from `platform/mobile`, a TestFlight build (`runbooks/ios-release.md`), or
   `npx eas-cli@latest build --profile development --platform ios` for a development build.
2. On an iPhone on iOS 17 or later, sign in, open Wardrobe, tap +, Photo.
3. Photograph, one at a time:
   - one piece laid flat on a plain surface (the ribbed vest);
   - two pieces laid touching (the cream top and skirt);
   - a piece lying beside another (the black bodysuit beside the pink piece);
   - a mirror selfie wearing several pieces;
   - from Home, Capture or add one piece from a single photo (a flat lay, then one you are
     wearing).
4. Add the pieces. On each piece's page, within a few seconds of the photo appearing:
   - flat single piece: the piece alone on white, straps and gaps intact;
   - touching pieces: each piece on its own, cut where they met;
   - neighbour: no scrap of the piece beside it;
   - worn: the rectangle, as before;
   - Home's single flat-lay photo: the piece alone on white a few seconds after it is read; the
     worn one stays a photograph.
5. Open the same pieces on the web: the same cutouts show.
6. Draw a look with a cut-out piece. It should draw as before; the ledger row for the picture
   is unchanged, and the piece's reference was `cutout.jpg`.
7. Check the PIECE tab's Detail row on a new piece with a strong feature (the coat). Change it,
   then draw a look with it.

If no cutout ever appears, check `app.generation_calls` for `wardrobe.cutout` rows. None at all
means the phone sent no lift (the module is missing from the build, or iOS is under 17). Rows
with `bad_lift` mean the lift file is not what the server expects.

## The one-off re-read of existing wardrobes

Pieces filed before 21 Nov 2026 were never asked for a defining detail. The re-read asks each
photo that one question and writes only the answer; it never touches a field she has edited or a
detail she has answered. **It does not run by itself, and must not be run on real wardrobes
without the owner's go-ahead on the figure it prints.** Owner's ceiling: $25, one-off.

From `platform/`, with the environment's database, bucket and Gemini key in the environment:

```bash
pnpm --filter @robes/workers detail:reread
```

That only counts and prices: pieces due, the average cost of a read from the ledger, the total,
and whether it is inside the ceiling. Show the owner that line. After her yes:

```bash
pnpm --filter @robes/workers detail:reread --run --limit=20
```

Look at a few of the twenty on staging, then:

```bash
pnpm --filter @robes/workers detail:reread --run --ceiling-usd=25
```

It stops before crossing the ceiling, when the day's photo-read budget (`gemini-flash`) is spent,
or after five failures in a row, and can be run again: it picks up where it stopped.

## Not built, on purpose

- Worn pieces (needs iOS 27's prompted segmentation or a server route).
- Any server vendor. A new one is a new `CutoutRoute` in `@robes/core/cutout` with its own budget
  line, a new processor in `docs/data-inventory.md`, and the licence decision in the brief.
- Cutting out pieces already in a wardrobe.
- A photo attached to a piece added by hand, and Change photo, are never read, so nothing says
  whether the piece is worn: they keep the photograph as it is.
- `wardrobe_items.cutout_asset_id` is no longer read by any code. Dropping the column is a later
  migration, once no phone build in use reads it, and needs Niall's yes (database-migrations.md).
