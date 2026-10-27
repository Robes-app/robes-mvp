# Robes — Claude Code guide

Two apps share this repo:
- **`platform/`** — the rebuild (Next.js, Expo, AWS, private Postgres). Working there? `platform/CLAUDE.md` governs; the rest of this file is about the legacy app and is reference only from platform work.
- **The legacy app (repo root)** — Express `server.js` + vanilla `public/` (no framework, no build step) + hand-run `supabase/*.sql`. It runs **beta.byrobes.com** (branch `beta`, live testers) and **www.byrobes.com** (branch `main`, landing + waitlist).

On `beta`, folder guides load when you work in them: `public/CLAUDE.md` (dashboard and pages), `supabase/CLAUDE.md` (migrations), `scripts/CLAUDE.md` (harnesses). `main` carries only the landing page (`public/index.html`, `look.html`, `js/app.js`) and `platform/`.

## Before you change a legacy surface
The reasoning behind every surface lives in **`docs/legacy-app-history.md`**: dated entries, newest first, each naming the functions it touched and the harness that pins it. Before changing a surface, `grep -n` it for the function or surface name and read the newest entry; a later entry supersedes an earlier one. Briefs and audits behind the bigger passes are in `docs/`; decisions (ADR-001 weekly removed, ADR-002 season bands + tags) are in `architecture-decisions.md`.

After a change ships, add a dated entry at the top of the history's dated section. Put a rule that must hold from now on in the relevant `CLAUDE.md`.

## Design principles (Annie, 2026-10-21) — override anything older
1. **Text to an absolute minimum.** One line where there would be a paragraph; no helper copy a control can carry; never repeat what the screen already shows.
2. **Native mobile first.** Start at 390pt, primary actions in thumb reach, bottom sheets over modals, touch targets ≥44pt. The web adapts from the phone.
3. **Cards and selections sit on white** with a hairline, or a `#C9BCA6` edge when selected; beige only below the page (Native parity handoff, 2026-10-25). Never black.
4. **Never show a count as a fraction** ("4 / 15", "4 of 15").
- **Retired: "one black fill per screen."** Don't withhold or restyle a dark button on that ground; harness pins that count ink fills are stale — update them when the screen they cover changes.

## Product invariants
Breaking one of these has been the bug every time.
- **A look is one entity with a state — suggested · draft · saved.** Nothing is written to the Lookbook or a day until she saves. A look reaches a day only once saved; from inside a day she adds a saved look.
- **A look is named, then saved.** Robes names what it generates (an offer, `name_provisional`); an unnamed hand-built look saves as today's date.
- **Wears are history.** A wear snapshots the pieces worn; it is never edited, only deleted and recreated.
- **She is in control of her Style DNA.** What Robes observes is pending until she keeps it; a rule typed in a look prompt waits under Observations. Prompt order is the hierarchy: her hard nos (the only absolutes) → her brief → memory → taste → photo reads (guidance). A colour she avoids is soft: never proposed new, still styled when she owns it.
- **Nothing is gated by piece count.** Copy never says lock/unlock; a threshold is a capability appearing.
- **Copy**: never "AI" or "the engine" — it's Robes. Her own words render verbatim. Months print by table (`Sept` is a bug).
- **Hidden, not deleted**: the trip (`_RB_TRIP_HIDDEN`, relaunch checklist in the history's 2026-10-10 entry), moodboards (`_RB_MB_HIDDEN`). The weekly track is deleted (ADR-001) — week planning is day chips in the Diary.

## Keep beta up
- Work on `beta`. Keep `main` in sync with path-level PRs from beta (`sync/<topic>` branches: `platform/`, this file, the history) — never a whole-branch merge, which would put the beta app on www.byrobes.com. Commit or push only when asked.
- Migrations are run by hand and lag the deploy, so **every new column ships with a client degrade**: strip the column on a PGRST204 naming it, retry, and stand the feature down quietly (`supabase/CLAUDE.md`).
- Run the harness for every surface you touch and read its **exit code**, not its last line (`scripts/CLAUDE.md`).

## Server (`server.js`) rules
- **Gemini**: `gemini-2.5-flash` counts thinking tokens inside `maxOutputTokens` — every structured-JSON call sets `thinkingConfig: { thinkingBudget: 0 }` or the JSON truncates. Vision calls that map to enums run at `temperature: 0`. A response-schema enum never holds `''` (Gemini 400s every call) — make the field optional instead. Model ids: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3.1-flash-image`; the 2.0/1.5/lite-preview ids 404.
- **Images** are generated in background jobs (`imageJobs` + `GET /api/images/:jobId`), one at a time with retries (all users share one key's rate limit), and hosted on Cloudinary before they reach a job or a saved row — base64 never lands in the client or the database.
- **Identity**: a `userId` in a request body is attribution for logging only, never a key to read another user's rows.
- **Section headers are `//` lines.** A `/* ──` header once commented out a whole route and `node --check` still passed. Every generation route the page harnesses stub needs a mount pin in `scripts/notify_smoke.mjs`.
- **Generated sources** — edit the source, then regenerate the SQL: `wardrobe_taxonomy.js` → `scripts/gen_taxonomy_migration.mjs`; `colour_model.cjs` → `scripts/gen_colour_model_migration.mjs`; `CATEGORY_DEFAULTS` → `scripts/gen_tag_defaults_migration.mjs`. `colour_model.cjs` and `material_model.cjs` stay CommonJS with the `typeof module` guard: the same file runs as a browser `<script>`.
- `generation_log` captures every Gemini call through one wrapper on `ai.models.generateContent` (needs `SUPABASE_SERVICE_ROLE_KEY`); `gen_id` ties a prompt to its calls and its saved artifact. Admin panel reference: `docs/admin-architecture.md`.
- Never set `NOTIFY_DEBUG=1` or `INBOX_ALLOW_PRIVATE=1` on a deployed service — both are test doors.

## Key files
| Path | What |
|------|------|
| `server.js` | Every API route, Gemini calls, Cloudinary, Airtable, the `/board` share pages |
| `style_dna.js` | Style DNA catalogs + `styleDnaPromptBlock` — the block every generation reads |
| `colour_model.cjs`, `material_model.cjs`, `wardrobe_taxonomy.js` | Shared vocabularies (server + browser); served at `/js/colour-model.js`, `/js/material-model.js` |
| `notify.js`, `inbox.js` | Resend mail sequence; forwarded receipts + product-page reader (config-injected, smoke-tested) |
| `public/dashboard.html` + `public/js/dashboard-personalize.js` | The app (~36k lines); see `public/CLAUDE.md` |
| `public/settings.html`, `onboarding.html`, `signup.html`, `reset.html`, `admin.html`, `board.html` | Standalone pages (`/stylenotes` redirects to `/settings`) |
| `supabase/` | Hand-run migrations, numbered in `supabase/CLAUDE.md` |
| `scripts/` | Playwright harnesses, smokes, generators |
| `docs/` | The history, briefs, audits |

## Deploy, env, Supabase
- `git push origin beta` deploys beta.byrobes.com via Railway (`npm start` → `node server.js`); `main` deploys www.byrobes.com.
- Railway env: `GEMINI_API_KEY`, `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `CLOUDINARY_CLOUD_NAME`/`_API_KEY`/`_API_SECRET` (on both services), `PUBLIC_URL` (`https://beta.byrobes.com` on beta, `https://www.byrobes.com` on production — drives share URLs and the `environment` capture column), `SUPABASE_SERVICE_ROLE_KEY` (server only), `RESEND_API_KEY` + `EMAIL_FROM` + `NOTIFY_SECRET` + `NOTIFY_TICK`, `INBOX_WEBHOOK_SECRET` / `RESEND_WEBHOOK_SECRET` + `INBOX_DOMAIN`. Missing keys degrade to silent no-ops; `/api/health` reports which are on.
- Supabase project `Robes_p0` — `https://ayowpaknssulsqqvwpqx.supabase.co`, publishable key `sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ`. Beta and production share it. Auth redirect allowlist must include each domain's `/**`.
- Analytics: PostHog EU via `public/js/posthog.js` on every page but `/admin`; call through `window.__rbPH`. Replay records typed text; password inputs carry `ph-no-capture` (keep it on any new one).
