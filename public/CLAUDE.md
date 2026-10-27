# public/ — the legacy app's pages

Vanilla HTML/CSS/JS, no build step: a push is live. Before changing a surface, `grep -n` its function name in `docs/legacy-app-history.md` and read the newest entry.

## How the dashboard boots
`dashboard.html` loads supabase-js → auth guard → sets `window.__robes_session` / `__robes_sb` / `__robes_profile` → loads the six minified bundle scripts in `dashboard-assets/` **in order** → calls `window.__robes_personalize()` (`js/dashboard-personalize.js`) → removes `#rb-boot`. The bundle's functions are private closures; personalize patches `App`, `WA`, `KP` and watches the DOM.
- `App` is a lexical `const`, not `window.App`. Personalize bridges it on its first line; keep `window.App` guards on any new `App.*` patch.
- A boot failure shows "Something went wrong loading your dashboard" and the try/catch swallows the cause — read the `Dashboard boot failed:` console line, not the later null errors.

## Rules that keep `dashboard-personalize.js` booting
- **State a function reads is `var`, declared above its earliest caller.** A `let`/`const` read before its line throws (temporal dead zone) and takes the whole dashboard down; a typeof-function guard does not help.
- **No bare `return` in the outer body of `__robes_personalize`** — it silently aborts every wiring after it. Early returns live inside their own IIFE.
- Read the session lazily on every call (`_waUid()`, `_waToken()`); it refreshes hourly.
- Never edit this file while a harness is running — every harness boot reloads it.

## One place for each job
Reuse these; a second implementation is how surfaces drift apart.
| Job | The one place |
|-----|---------------|
| Home's modules and their order | `_rbHomeResolve` → `_lkHomeSync` (paints) → `_rbFtueOrder` (sequences) |
| Draw a look anywhere | `window._rbLookTile` — never a second look card |
| The look panel + the rack | `_rbConsole`, `_rbcRow`, `_rbRackRolesHtml` |
| A day card (home strip, Diary, trip) | `_dcCard` / `_dcMoments`; look names on a day via `_dcLookPhrase` |
| Open / rename a day | `_rbOpenPlannedDay`, `__rbDayOpen`; `_rbDayRename` |
| The prompt box | `_rbLookPrompt`; an undated ask → `__rbPromptLook` → the keep-or-pass deck |
| Pick or swap a piece in a look | `__cbWardrobePick` (swap mode, Undo pill) |
| Edit a piece (add + view) | `__psOpen(host, kind)` with `_psAdapters` — open on the host that rendered the rows |
| Write a wardrobe / wishlist row | `_waRowWrite` (the strip-and-retry ladder) with `_rbColourFields`, `_rbMaterialField` |
| Save to the wishlist | `_wlSaveFromItem` |
| Commit a saved look's pieces | `_lkCommitPieces`; picture ladder `_lkFrameOf` → `_lkHeroUrl` |
| Keep the Diary index in step after any blob change | `_pdSync` / `_pdSyncSaved` |
| Nav chrome | `_rbRetHtml` (return band), `_rbTitleHtml`, `_rbMastHtml`, `.rb-pill` |
| Delete anything | behind `_rbConfirmDelete` |
| Generation overlay | `_rbOverlayGuard` (90s abort, Cancel at 15s) |
| Photo before upload | `_rbDownscale` (1600px JPEG) |
| Events / feedback rows | `_rbTrack`, `_rbFbCloud` via `_rbCapturePost` |

## Overlays and layers
Result pages, the Lookbook and the piece page are `position:fixed` overlays under the nav (`--nav-h`): result pages z-40, Lookbook/Inspiration 45, piece page 46, mobile dock 48, nav 50, sheets 950+. **An opener that renders one overlay from inside another closes the higher one first** — a display check passes while she sees nothing. A new overlay joins `_rbHideResultPages` / `__rbCloseResultOverlays`. URLs are pushed with `_rbNav(path)`.

## Data and storage
- localStorage/sessionStorage keys carry the uid (`rb_x__<uid>`). An unscoped key leaks between accounts in one browser (the `rb_onboarded` and `__anon` bugs).
- Saved rows hold Cloudinary URLs only (`http…`), never base64.
- Insert-only tables (`events`, `feedback`) post with `Prefer: return=minimal` (`_rbCapturePost`); `return=representation` fails RLS for every non-admin.
- Dates are local: `_pdLocalISO()`, never `toISOString()` (off by one at night in the US). Months print by table (`_rbMon3`).
- Feature flags per device: `?trip=on`, `?daycard=off`, `?diary=off`, `?prompt=card`.

## HTML/CSS traps
- The Supabase client on standalone pages is `sbClient` — `supabase` collides with the CDN global.
- Never re-alias a token `tokens.css` defines (`--cream-300: var(--cream-300)` cycles and kills every rule reading it).
- An inline `display` beats `hidden`: add `[hidden]{display:none}` to anything flex/grid you hide that way.
- `aspect-ratio` on a `<span>` needs a `display`; grid tracks are `minmax(0,1fr)` so a card can't widen its column.
- `capture` goes only on a dedicated "Take a photo" input, never on a picker (it hides the photo library).
- SVG data URLs carry no `<!-- -->` comments.
- Uppercase-transformed labels: assert `textContent` in harnesses, `innerText` returns caps.
- Gemini analyse failing fast with `analysis_failed` is usually quota — read the response's `reason`.
