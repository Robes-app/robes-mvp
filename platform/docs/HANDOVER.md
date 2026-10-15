# Handover: the new Robes codebase

For the founder, in plain English. You don't need to code: Claude Code does the typing. This page tells you what you have, how to see it working, how to ask Claude for changes, and the few rules that keep it safe.

## What you have

- **The new web app and API** (`platform/app`): what will eventually replace the current site. The website and the phone app both talk to the same API.
- **The new iPhone/Android app** (`platform/mobile`), built with Expo.
- **Staging**: a private copy online at **https://staging.byrobes.com**, for trying things before real customers see them. It has its own database (Supabase) and its own AWS account for email, photos and background AI work.
- **The current app** (everything outside `platform/`) keeps running byrobes.com exactly as before. Nothing in `platform/` changes it.

What is built, and what from the current app hasn't been carried across yet: [`STATUS.md`](STATUS.md). Why it was rebuilt and how the screens map: [`../README.md`](../README.md).

## Working with Claude Code

1. Open a terminal, then `cd` into the **`platform`** folder of the repo before starting `claude`. That's what makes Claude read `platform/CLAUDE.md`, which holds every rule for this codebase. Started from the repo root, it reads the current app's rules instead.
2. Ask in plain words. For example:
   - "Set up the platform on my Mac and start the web app. Explain each step."
   - "Run the Robes app on my iPhone against staging." (Claude follows [`runbooks/mobile-founder-setup.md`](runbooks/mobile-founder-setup.md).)
   - "The current app's daily look screen changed last week; bring the same change into the platform for web and mobile."
   - "Show me the latest suggested-look prompt and change the tone of the scene line to …"
   - "Before I merge, run all the checks and tell me in plain words if anything is wrong."
3. Ask Claude to **work on a branch and open a pull request**. Never ask it to push straight to `main` or `beta`. Read its summary, and merge when the checks are green.
4. If Claude says a request would break a security rule, believe it, and ask for the safe way to get the same result. There almost always is one.

## Seeing it on your own computer

You need a Mac with **Docker Desktop** running and **Node 24**. Claude can install and check both for you. Then, in `platform/`:

| You want | Ask Claude to run | Then |
|---|---|---|
| First-time setup | `pnpm bootstrap` | Takes a few minutes; creates a private local database, photo storage and a mail catcher |
| The website | `pnpm dev:web` | Open http://localhost:3300 and sign in with any email |
| The sign-in code | — | It arrives in the local mail catcher at http://localhost:58025, not your inbox |
| The phone app against staging | `pnpm dev:mobile:staging` | Scan the QR code with the Expo Go app |
| Check nothing is broken | `pnpm verify` | All green means good |

Locally, the AI is a stand-in that gives the same answers every time, so you can click through everything for free. Real Gemini answers come only when a `GEMINI_API_KEY` is set, which staging has.

## Staging and test builds

- **Web:** https://staging.byrobes.com. Sign in with your email; the code arrives by email. Until Amazon approves the sending account for production, only email addresses verified in AWS can receive codes. Ask for an address to be added.
- **Phone, day to day:** Expo Go, as above ([`runbooks/mobile-founder-setup.md`](runbooks/mobile-founder-setup.md)).
- **Phone, a proper test build (TestFlight):** [`runbooks/mobile-test-builds.md`](runbooks/mobile-test-builds.md). Test builds use the id `com.byrobes.app.staging`, so the real App Store id `com.byrobes.app` stays reserved for launch.
- **Updating staging:** merging a pull request that changes `platform/` into `beta` redeploys staging automatically. Changes to the current app alone don't trigger it.

## The rules that keep it safe (plain English)

Claude knows these in full ([`api-security.md`](api-security.md)). What they protect:
- **One person can never see another's wardrobe, photos or looks.** The app works out who you are from your sign-in, never from what the screen sends.
- **Photos are private.** They are only shown through short-lived signed links.
- **AI calls cost money,** so they run as background jobs with per-person limits and a spending cap.
- **Passwords, keys and tokens never go in the code or in chat.** They live in Vercel and AWS settings.
- **Every change runs the full checks.** A red check is a real problem, never something to skip.

## Accounts and where things live

| What | Where | Notes |
|---|---|---|
| Code | GitHub `Robes-app/robes-mvp` | The platform lives in the `platform/` folder |
| Web hosting (staging) | Vercel, team Codú, project `robes-app` | Root folder `platform/app` |
| Database (staging) | Supabase, EU | Changed only through migrations, never by hand in the dashboard |
| Email, photos, background AI | AWS account 259887029472, Ireland | Set up from code in `platform/infra`; [`runbooks/environments.md`](runbooks/environments.md) |
| Phone builds | Expo (EAS) | [`runbooks/mobile-test-builds.md`](runbooks/mobile-test-builds.md) |
| Production | Not set up yet | Same steps as staging, in its own accounts |

Hosting, AWS and Expo should end up in Robes-owned accounts before launch. Moving them is a settings job, not a code change.
