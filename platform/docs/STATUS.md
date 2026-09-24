# Platform status

What is built, what runs where, and what is left, for whoever picks this up next. Plans and
decisions live in `plans/`, `SPEC.md` (ADRs) and `CLAUDE.md` (rules); this page is the map.

## Run it

```bash
pnpm bootstrap            # deps, docker services (Postgres, MinIO, Mailpit), migrations, buckets
pnpm dev:web              # http://localhost:3300 — sign in with any email; codes land in Mailpit (http://localhost:58025)
pnpm dev:mobile           # Expo Go; see README → Mobile for simulators and phones
pnpm verify               # lint + typecheck + unit + DB suites (what every commit passes)
pnpm --filter @robes/app test:e2e   # Playwright against `next start`
pnpm notify               # one email tick → Mailpit
pnpm maintenance          # retention, outbox sweep, account deletion, data export
```

Without `GEMINI_API_KEY` every AI call uses the deterministic fake, so all flows work offline.

## Built (by roadmap milestone)

| Area | Web | Native | API / worker |
|---|---|---|---|
| M0/M1 platform | shell, CSP nonces, security headers | Expo Router, SecureStore session | `route()`/`sseRoute()` wrapper, Better Auth passwordless OTP (+ Apple/Google when configured), jobs outbox (inline in dev, SQS in AWS), SSE progress, flags, quotas, spend breaker, consents |
| Media | uploads, signed renditions | camera/roll upload | presigned PUT → RenditionFn (sharp, AVIF/WebP, blurhash); CloudFront signed URLs/cookies |
| M2 shell | nav, ⌘K, Create sheet, You area | tabs, Create modal, You stack | `/me`, notification prefs, deletion request |
| M3 wardrobe | grid, add, piece page, wishlist | same | pieces CRUD + undo, batch analyse job, wishlist + "I bought this" |
| M4 styling | style a piece, ideas, saved looks, look page, composer, share, You › Style | same | `key_piece` job (text then frames), ideas, looks + variants + wears, style DNA engine (legacy parity fixtures), colour/silhouette analysis job, shares (128-bit token, signed ≤2 h images) |
| M5 today & plan | Today (next step, week strip, tray), Style it for today, Plan | same | `/today`, next-step rules, `daily` job (weather via Open-Meteo), plan pin/unpin/rename |
| M6 comms & admin | unsubscribe page, waitlist + confirm, admin app, data export | — | notify tick (looks ready, five, empty week, morning cue; RFC 8058 one-click), account deletion (SEC-80), data export (SEC-81), admin reads (every read audited), waitlist (SEC-60) |
| M7 native | — | push registration + deep links, Sentry (JS), consent-gated PostHog | push tokens API, Expo push channel on the notify tick |

## Infrastructure

CDK stages `Staging` / `Production` (`infra/`), selected with `-c stage=` or `ROBES_STAGE`;
member/small accounts use `ROBES_<STAGE>_BUDGETS=off` and `ROBES_<STAGE>_GENERATE_RESERVED_CONCURRENCY=0`
(`runbooks/environments.md` §4 step 10). Staging was deployed to the sandbox account
259887029472 (eu-west-1) on 2026-09-24.

**Pending in the sandbox** (needs fresh admin credentials; review `pnpm cdk diff 'Staging/*'` first):
1. ~~Redeploy~~ done 2026-09-24 (schedules `account-deletion`/`data-export`, notify env, exports lifecycle and grants).
2. Put the CloudFront private key matching `infra/config/keys/staging.cloudfront.pub.pem` into
   `robes-staging/cloudfront/signing-key`; if the private half is lost, rotate
   (`runbooks/key-rotation.md` §CloudFront).
3. Set real values for the placeholder secrets: `gemini/api-key`, `unsub/hmac-key` (and the same
   value as Vercel `UNSUB_HMAC_KEY`), `expo/access-token`, `database/url`, `auth/*`.
4. SES: add the DKIM/MAIL FROM DNS records from the `Stg-Email` outputs; request production access.
5. Vercel project + env (`runbooks/environments.md` §6), Turnstile keys, Upstash.

## Known gaps (not built yet)

- Receipts: no photo-based re-read of receipt lines (legacy vision pass; would need image fetching); product images kept as metadata only. Activating the SES rule set and the `in.` MX record are ops steps (`runbooks/environments.md` §9).
- Alternates rail and swapping pieces in a daily draft (secondary frames now render on demand via `look_render`).
- Avatar/model (`look_waiting`, `borrowing` emails, `model`/`finish` next-step rules depend on it).
- Overnight daily batch (M5 task 3). Trips: no images, no "more looks from this capsule", trips not drawn as Plan blocks.
- Legal texts (pages exist, copy "On its way"), "export ready" email, push receipts polling.
- Native Sentry crash reporting needs an EAS/dev build; push needs an EAS project id + APNs/FCM.
- M8 monetisation.
- Legacy migration tooling: see `migration.md` (rehearsed locally against a fixture, not the real legacy DB).

## Flakes to watch

- `wardrobe-ui` wishlist Undo under heavy parallel load (seen once, not reproduced).
- `ui-native` Sheet test once under a full parallel run.
