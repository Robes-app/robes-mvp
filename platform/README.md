# Robes Platform

This folder holds the new Robes codebase: a Next.js web app and a native iOS/Android app (Expo). Both run on one shared API, one design system and one data model.

It is the same product as the Robes app in the root of this repo: same screens, same flows, same style DNA and prompts. It is rebuilt on foundations that can grow with a team and a user base, and that work properly on a phone. The root app is left as it is. It keeps serving www.byrobes.com and beta.byrobes.com until we choose to switch over, and nothing in `platform/` imports from it or changes it.

**Where to read next:**
- [`docs/STATUS.md`](docs/STATUS.md): what is built, what runs where, what is still to do.
- [`docs/DEVELOPING.md`](docs/DEVELOPING.md): engineering guide (commands, architecture, recipes).
- [`CLAUDE.md`](CLAUDE.md): the rules every change must follow.

## Why a new codebase

The root app proved the product. It is one Express server (`server.js`, ~4,200 lines) plus hand-written HTML pages (`public/dashboard.html` alone is ~2,700 lines), calling Gemini, Supabase and Cloudinary directly. That was the right way to find the product, but it is hard to grow:

| | Root app today | New platform |
|---|---|---|
| **Phones** | Mobile web only | A real iOS/Android app (Expo) on the same API, plus a responsive web app |
| **Code structure** | One server file and page-sized HTML | Small packages (API, DB, AI, jobs, media, UI) that a team can own and test separately |
| **Slow AI work** | Runs inside the web request | Background jobs (AWS SQS + Lambda) with live progress, retries, quotas and a spend limit |
| **Photos** | Uploaded to Cloudinary as base64 through the server | Private by default; resized to AVIF/WebP, EXIF/GPS stripped, delivered through signed CloudFront URLs |
| **Data safety** | Pages query Supabase tables directly from the browser | Private Postgres behind the API. Every query is scoped to the signed-in user, with a test proving one user can't read another's data |
| **Sign-in** | Supabase email + password (and Google) | Passwordless email codes (plus Apple/Google when configured), with server-side sessions |
| **Quality gates** | Manual testing | Lint, typecheck, unit, database and browser (Playwright) tests on every change; Maestro flows for the app |
| **Infrastructure** | Hand-configured | AWS defined in code (CDK) with separate staging and production |

## Same product: what has been carried over

The prompts, the style DNA engine and the product rules were ported from the root app and are checked against it. For example, the style DNA test fixtures are generated from the root `style_dna.js`. Screen by screen:

| Root app | Web (`app/`) | Phone (`mobile/`) |
|---|---|---|
| Sign up, onboarding | `/auth/sign-in`, `/onboarding` | sign-in, onboarding |
| Dashboard / Today, daily looks | `/`, `/today/style`, `/today/looks/[id]` | Today, today/style, today/look |
| Wardrobe, add pieces, inbox | `/wardrobe`, `/wardrobe/add`, `/wardrobe/inbox`, `/wardrobe/link`, `/wardrobe/wishlist`, `/piece/[id]` | wardrobe, add, wardrobe/link, piece |
| Style a piece, look builder, lookbook | `/looks`, `/looks/style`, `/looks/new`, `/looks/ideas`, `/look/[id]` | looks, looks/style, looks/new, idea, look |
| Plan, travel | `/plan`, `/trip/new`, `/trip/[id]` | plan, trip/new, trip |
| Board / shared look | `/share/[token]` | share links open the web page |
| Settings, account, privacy | `/you`, `/you/style`, `/you/model`, `/you/notifications`, `/you/privacy`, `/you/account` | you, style, model, notifications, privacy, account, delete, receipts |
| Forwarded receipts | Inbox, from SES inbound email | receipts |
| Emails (looks ready, nudges, unsubscribe) | notify worker + `/unsubscribe` | push notifications |
| Waitlist | `/waitlist/confirm` | — |
| Admin | `/admin` (users, costs, flags, audit) | — |

**Not carried over yet.** The root app is still moving, and these features landed there after the port (details and rough sizes in [`docs/STATUS.md`](docs/STATUS.md) → Legacy sync):
- Refining a look in her own words.
- The look prompt (asking about a draft look) and per-piece styling notes.
- Look states (Suggested → Draft → Saved), the keep-or-pass deck and the modular home.
- Style memory, and her brief, brands and facts in Settings.
- Travel looks re-styled from the case.
- The latest beta work (several pieces from one photograph, one piece per slot on suggested looks, prompt cost trims), merged into this branch but not yet ported.

Bringing these across is the next block of work. Until then, the root app stays the source of truth for product behaviour.

## What is in this pull request

Only additions; nothing in the root app changes.
- **`platform/`:** the web app, mobile app, API, workers, infrastructure, migrations and docs.
- **`.github/workflows/platform-*.yml` and `.github/actions/platform-*`:** CI for the new code.
  - It runs only on pull requests that touch `platform/`.
  - The staging deploy runs only on pushes to a `platform` branch.
  - The production deploy is manual.
  - Existing workflows are untouched.

Fixes made while standing up staging:
- **Database TLS:** connections to the Supabase-hosted database are verified against Supabase's root certificate (`packages/db/src/tls.ts`). Without it the deployed app refused every database call.
- **AWS keys on Vercel:** one IAM key pair, named `ROBES_AWS_*` because Vercel reserves `AWS_*`. It is passed explicitly to email (SES), storage (S3) and queues (SQS).
- **Vercel build:** pinned pnpm 11 so Vercel builds the platform workspace, not the root app.
- **Rate limits:** stored in Postgres, so Upstash/Redis isn't needed.
- **Optional services:** Sentry, PostHog and Turnstile are only required in production.
- **App variants:** separate dev, staging and production builds (`com.byrobes.app.dev`, `.staging` and `com.byrobes.app`), so test builds never take the App Store id.
- **Local email:** Mailpit catches every email locally, sign-in codes included.

## Running it locally

You need Node 24 and Docker. Everything runs on your machine (Postgres, S3-compatible storage, a mail catcher), and without a `GEMINI_API_KEY` the AI is a deterministic fake, so it works offline.

```bash
cd platform
corepack enable
pnpm bootstrap      # install, start services, migrate, create buckets, write app/.env.local
pnpm dev:web        # http://localhost:3300 — sign in with any email
pnpm dev:mobile     # Expo: press i for the iOS simulator, or scan the QR code with Expo Go
```

Sign-in codes arrive in Mailpit at http://localhost:58025. Before pushing, run `pnpm verify` (lint, typecheck, unit and database tests). See [`docs/DEVELOPING.md`](docs/DEVELOPING.md) for phones on your network, admin access and troubleshooting.

## Environments

| | Web + API | Database | AWS (jobs, email, media) | Mobile build |
|---|---|---|---|---|
| Local | `pnpm dev:web` | Postgres in Docker | Fakes: MinIO, Mailpit, in-process jobs | `com.byrobes.app.dev` via Expo |
| Staging | Vercel `codu/robes-app` production → https://staging.byrobes.com (also robes-app-two.vercel.app) | Supabase (EU) | Sandbox account, eu-west-1, `Staging/*` stacks | `com.byrobes.app.staging` via EAS → TestFlight |
| Production | Not set up yet | — | `Production/*` stacks (not deployed) | `com.byrobes.app` |

How to set up and operate each environment: [`docs/runbooks/environments.md`](docs/runbooks/environments.md).
