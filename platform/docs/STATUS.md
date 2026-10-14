# Platform status

What is built, what runs where, and what is left, for whoever picks this up next. Plans and
decisions live in `plans/`, `SPEC.md` (ADRs) and `CLAUDE.md` (rules); this page is the map.

## Run it

```bash
pnpm bootstrap            # deps, docker services (Postgres, MinIO, Mailpit), migrations, buckets
pnpm dev:web              # http://localhost:3300 — sign in with any email; codes land in Mailpit (http://localhost:58025)
pnpm dev:mobile           # Expo Go; see docs/DEVELOPING.md → Mobile sign-in
pnpm verify               # lint + typecheck + unit + DB suites (what every commit passes)
pnpm --filter @robes/app test:e2e   # Playwright against `next start`
pnpm notify               # one email tick → Mailpit
pnpm maintenance          # retention, outbox sweep, account deletion, data export
pnpm batch:tick -- --now=2026-09-24T04:30:00Z [--user=<id>]   # overnight Today look (fake batch locally)
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
1. ~~Redeploy~~ done 2026-09-24 incl. `Stg-Inbound`. Still to do by hand: MX `in.staging.mail.byrobes.com` →
   `10 inbound-smtp.eu-west-1.amazonaws.com` and activate the rule set (`runbooks/environments.md` §9 step 7).
2. ~~CloudFront private key~~ in `robes-staging/cloudfront/signing-key` (2026-09-24).
   Vercel project `codu/robes-app` (root `platform/app`, dub1, Node 24) is linked with non-secret env set;
   run `bash scripts/staging-bootstrap.sh` to migrate Supabase, create the robes_app login and set every
   secret (Vercel + Secrets Manager), then `vercel deploy --prod --scope codu` from the repo root.
3. Set real values for the placeholder secrets: `gemini/api-key`, `unsub/hmac-key` (and the same
   value as Vercel `UNSUB_HMAC_KEY`), `expo/access-token`, `database/url`, `auth/*`.
4. SES: add the DKIM/MAIL FROM DNS records from the `Stg-Email` outputs; request production access.
5. Vercel project + env (`runbooks/environments.md` §6), Turnstile keys, Upstash.

## Known gaps (not built yet)

- Receipts: no photo-based re-read of receipt lines (legacy vision pass; would need image fetching); product images kept as metadata only. Activating the SES rule set and the `in.` MX record are ops steps (`runbooks/environments.md` §9).
- Alternates rail and swapping pieces in a daily draft (secondary frames now render on demand via `look_render`).
- `borrowing` email and `finish` next-step rule (need look proposals). Your model: no photographed try-on from her own photos (renders use the catalog portrait for her picks, per SEC-22).
- Trips: no images, no "more looks from this capsule", trips not drawn as Plan blocks.
- Legal texts (pages exist, copy "On its way"), "export ready" email, push receipts polling.
- Native Sentry crash reporting needs an EAS/dev build; push needs an EAS project id + APNs/FCM.
- M8 monetisation.
- Legacy migration tooling: see `migration.md` (rehearsed locally against a fixture, not the real legacy DB).

## Legacy sync 2026-10-13

Legacy `2aef362..origin/beta` (the 2026-10-01 → 10-10 beta work) reviewed against the platform.

**Ported:** the style DNA prompt block (fixtures regenerated from legacy `style_dna.js`; platform feeds
`style_archetypes` only, since the other inputs aren't stored yet); `style-piece` v2 (itemised pieces per
way, owned pieces resolved to `pieceId`); `daily`/`travel` v2 (one hero per look, rotated);
`wardrobe-analyse`/`receipt-read` v2 (the label never carries the brand); legacy migrations 24/25 in
`scripts/migrate` (saved looks only, see `migration.md`).

**Already equivalent:** the trip-hidden mail rule (notify only reads look-backed plan days), account delete
(SEC-80). **Legacy-only:** `/settings` redirects, email link paths, the `TRIP_HIDDEN` board-share rule, docs.

**New in legacy, not built here** (rough effort):
- Refine in her own words on daily/style/travel looks (`refineBlock`, `/api/look/refine`), M.
- The look prompt: `/api/look/ask` with ASK intents over a draft look, plus per-piece `styled` notes
  (`looks.styling`) that ride into the avatar render, L.
- Look states (Suggested → Draft → Saved, `anchor_piece_id`/`set_id`), the keep-or-pass deck and the
  modular home, L.
- Style memory (verdicts, swaps, wears, strikes, asks) feeding the DNA block, M–L.
- Her brief, brands, investment and facts in Settings (`/api/stylenotes/brief`, `/season`), M.
- Avatar frame mode (re-dress Robes' own frame of a suggested look), S once look states exist.
- Travel looks re-styled from the case (`held`, refine), M; the platform has no trip looks yet.

## Flakes to watch

- `wardrobe-ui` wishlist Undo under heavy parallel load (seen once, not reproduced).
- `ui-native` Sheet test once under a full parallel run.
