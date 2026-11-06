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

The app's tokens still come from `packages/tokens/src/tokens.ts` (`docs/design-system.md`). Felix is the design reference; it isn't imported.
