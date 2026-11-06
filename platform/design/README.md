# Design

`felix/` is a copy of the **Felix Design System** artifact: https://claude.ai/artifact/WQbKKFzKP4pKnDE1eGczV7

The artifact is the source. Edit Felix there, then refresh this copy (ask Claude: "save Felix into the repo"). Don't edit `felix/` by hand: the next refresh overwrites it.

| Path | What |
|---|---|
| `felix/README.md` | The brand book: principles, voice, colour, type, layout |
| `felix/tokens.json` | Colour, type, spacing, radius and shadow tokens |
| `felix/components/<Name>/` | Guidelines (`README.md`) and preview (`preview.html`) per component |
| `felix/components/bundle.js`, `bundle.css`, `index.d.ts` | The preview library (`window.Felix`), not app code |
| `felix/assets/` | Icons, Imagery, Pieces (copies of the artifact's uploads) |
| `felix/fonts/` | Cormorant and Inter, Latin subsets |
| `felix/design-system.json` | The artifact's index |

Previews load uploads as `/_blob/<id>`, so they only render inside the artifact. To find the file for an id, look it up in `design-system.json` under `assetGroups`.

The app's tokens come from `packages/tokens/src/tokens.ts`, which carries Felix's values (`docs/design-system.md` §4 lists the names and the exceptions); icons come from `packages/icons`, which draws Felix's glyphs. Felix is the design reference; it isn't imported.

## Reference frames

`reference/` holds the screen designs the native rebuild works to, exported from the "Front Door design frames" artifact (2026-11-06):

| File | Screen |
|---|---|
| `reference/3a-home-day-one.png` | Home on day one: no pieces, twin or look; Capture · Describe · Pick |
| `reference/3k-home-ootd.png` | Home once she's using it: today's look, Swap · Edit, the bell, worn marks on the strip |
| `reference/3e-saved-look.png` | A saved look: photo, Pieces · Details, the piece list, Schedule look |

Screens without a frame (the Draft Look and its sheets, a wardrobe piece, notifications, settings) work to the Felix component previews.
