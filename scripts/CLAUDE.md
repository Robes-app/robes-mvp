# scripts/ — harnesses, smokes, generators

## Running a harness
```bash
npm i --no-save playwright          # once
node scripts/looks_harness.mjs      # set CHROME_PATH if playwright's browser isn't installed
```
- **Read the exit code, not the last line.** The crash handler prints the count too: `nav_chrome_smoke` once reported "39/39 passed" while three sections never ran.
- Each harness boots the real `server.js` on a fixed port. **Shared port 4327**: `diary_harness`, `travel_console_smoke`, `avatar_client_smoke` — run them one after another. `onboarding_harness` and `settings_harness` take `PORT=`.
- A crashed run leaves `node server.js` holding its port and the next run fails oddly (`ERR_CONNECTION_REFUSED` mid-run). Find it with `lsof -i :<port>` and kill it by pid — `pkill -f "node server.js"` from a shell whose own command line matches kills that shell.
- Never edit `public/js/dashboard-personalize.js` while a harness runs.
- `RB_SHOTS=<dir>` (addflow, settings) writes screenshots for eyeballing.

## Writing checks
- Harnesses stub the Supabase CDN and REST routes; **a route the page calls must be stubbed**, and a stubbed generation route proves nothing about the real server — add its mount pin to `notify_smoke.mjs` (the one smoke that boots the real routes).
- Stubs that the app writes then re-reads (e.g. `planned_days`) must be stateful, or a refetch erases what the test just did.
- Uppercase-transformed labels: assert `textContent`.
- A saved look opens the diary sheet — close it (`__lkDiaryClose`) before the next grid pin.

## Which harness covers what
| Surface | Harness |
|---------|---------|
| Home modules, week strip | `home_harness` |
| Looks, composer, look page, drafts | `looks_harness` |
| Wardrobe add flow, piece sheet, receipts, links | `addflow_harness`, `multipiece_harness` |
| Piece page, wardrobe list | `piece_page_smoke` |
| Key piece, prompt box, deck | `inspiration_smoke` |
| Diary, day page | `diary_harness` |
| Trip | `travel_console_smoke` |
| Nav chrome, mobile dock | `nav_chrome_smoke` |
| Settings, twin, Style DNA | `settings_harness` |
| Onboarding | `onboarding_harness` |
| Prompt block | `style_dna_block_test` |
| Colour / material models | `colour_model_test`, `material_model_test` |
| Mail, real-server route mounts | `notify_smoke` |
| Receipt inbox | `inbox_smoke` |

## Other scripts
- `gen_*_migration.mjs` regenerate generated SQL from their source module — run after editing it.
- `*_test.sh` replay migrations into a **throwaway** database (`DATABASE_URL`).
- `backfill_planned_days.mjs`, `gen_archetype_tiles.mjs`, `avatar_render_smoke.mjs` need production keys (`railway run …`).
