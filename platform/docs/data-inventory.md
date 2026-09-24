# Data inventory (SEC-85)

This lists every piece of personal data the platform stores, why we store it, how long we keep it and who processes it. The privacy notice, the sub-processor list and the App Store and Play privacy labels are all generated from this one inventory.

**Rule:** a change that adds, moves or starts sending personal data (a new column, table, bucket prefix, log field, analytics property or third party) updates this file **in the same PR** (`CLAUDE.md`).

Schema source of truth: `db/migrations`. Retention jobs: `private.run_maintenance()` (`20260924001000_retention_jobs.sql`), which EventBridge runs through `maintenanceFn` (SEC-82). Account deletion (SEC-80) deletes `app.users` last, and every user-owned row below cascades from it. "Life of account" means kept until the user deletes their account.

## 1. Stored data

| Table / location | Personal data | Purpose | Retention | Processors |
|---|---|---|---|---|
| `app.users` | `email`, `name`, `image` (OAuth avatar URL), `email_verified` | Account identity and sign-in | Life of account | Postgres host |
| `app.sessions` | `token`, `ip_address`, `user_agent` | Keep a device signed in; security review | Until expiry or sign-out; cascades on deletion | Postgres host |
| `app.accounts` | Apple/Google `account_id`, OAuth tokens, `id_token` | Link Apple/Google sign-in | Life of account | Postgres host; Apple, Google (identity providers) |
| `app.verifications` | Email address (`identifier`), hashed one-time code | Email OTP sign-in | 10 minutes (expiry); spent rows are deleted | Postgres host |
| `app.rate_limits` | Keys contain the client IP or user id | Auth rate limiting (Better Auth) | Rolling window; rows overwritten | Postgres host |
| Upstash Redis | Rate-limit keys containing the user id or client IP | API rate limiting | The limit window (seconds to minutes) | Upstash (EU) |
| `app.profiles` | `first_name`, `last_name`, `mobile`, `gender_identity`, `instagram_handle`, style answers (`style_icons`, `style_archetypes`, `budget`, `annual_spend`, `splurge_categories`, `wardrobe_description`), `home_city`, `home_lat`/`home_lon`, `locale`, `timezone`, `currency`, preferences | Personalise styling, weather and the greeting | Life of account | Postgres host; Gemini (style context in prompts) |
| `app.style_profiles` | Colour season, undertone, contrast, body type, headshot and full-length photo refs, overrides | Colour and fit analysis | Life of account | Postgres host; Gemini |
| `app.user_ui_state` | Dismissed hints, last visit, seen features | UI continuity | Life of account | Postgres host |
| `app.consents` | Consent answers (`analytics`, `replay`, `marketing_email`, `photo_analysis`), source, timestamp | Proof of consent (SEC-84); append-only | Life of account | Postgres host |
| `app.push_tokens` | Expo push token, platform, app version | Push notifications | Until revoked or account deletion | Postgres host; Expo (push delivery), Apple (APNs), Google (FCM) |
| `app.assets` + S3 `uploads/{userId}/…`, `media/{userId}/…`, `generated/…` | User photos (wardrobe, looks, headshots and full-length photos are flagged `sensitive`) and generated images. EXIF/GPS are stripped from renditions | Wardrobe, looks, analysis, renders | Life of account; soft-deleted rows purged after 30 days | AWS S3 + CloudFront (eu-west-1), AWS Lambda (renditions); Gemini (analysis/edits, only for photos sent to a job) |
| `app.avatars` | Avatar composition ids | Styled avatar renders | Life of account | Postgres host |
| `app.wardrobe_items`, `app.wishlist_items`, `app.tags`, `app.tag_pieces` | Piece labels, brands, notes, prices, sizes, source URLs, photo refs | The wardrobe | Life of account; soft-deleted rows purged after 30 days | Postgres host; Gemini (piece reads) |
| `app.wardrobe_inbox`, `app.inbox_addresses` | Per-user inbound address, receipt `from_email`, `subject`, retailer, order ref, parsed pieces | File purchases from receipts | Sender and subject cleared 90 days after a decision; the rest for the life of the account | Postgres host; AWS SES (inbound, planned) |
| `app.looks`, `app.look_pieces`, `app.tag_looks` | Look names, notes, photo refs, climate | Saved looks | Life of account; soft-deleted rows purged after 30 days | Postgres host |
| `app.wears` | Dates worn, pieces, notes | Wear diary (immutable) | Life of account | Postgres host |
| `app.planned_days`, `app.artifacts` | Planned dates, activities, headlines, generated outfits and trips | Plan and Today | Life of account; unsaved ideas expire, then soft-deleted rows are purged after 30 days | Postgres host |
| `app.shares` | Snapshot of a shared look or board | Public share links | Until revoked or expired; legacy tokens expire 180 days after cutover | Postgres host; CloudFront (`shared/` snapshots) |
| `app.generation_jobs`, `app.generation_assets` | Job input (ids and intent only, SEC-16), outputs, trace id | Run generation jobs | Life of account | Postgres host; AWS SQS + Lambda; Gemini |
| `app.generation_calls` | `prompt` and `response` text, model, tokens, latency, cost | Debugging and cost control (access-controlled; never logged, SEC-83) | Prompt/response cleared after 30 days; rows deleted after 13 months | Postgres host; Gemini (sent the prompt) |
| `app.generation_cache` | Cached outputs keyed by input hash | Avoid paying twice | Until `expires_at` | Postgres host |
| `app.entitlements`, `app.usage_counters` | Plan, billing reference, usage counts | Quotas and plans | Life of account | Postgres host |
| `app.events` | `user_id`, event type, metadata | First-party product events and the admin activity feed | 13 months | Postgres host |
| `app.feedback` | `email`, rating, `note`, context, optional photo | Product feedback | Life of account (no purge yet) | Postgres host |
| `app.waitlist` | `email`, `name`, `instagram_handle`, source, UTM | Pre-launch waitlist and invites | Until unsubscribed or converted (no purge yet) | Postgres host; AWS SES (invites) |
| `app.notifications` | Kind, channel, provider message id, status | Delivery record, no resends | Life of account (no purge yet) | Postgres host; AWS SES, Expo |
| `app.email_suppressions` | `email`, bounce/complaint reason | Never email a suppressed address | Indefinite, and kept after account deletion so a suppressed address stays suppressed (legitimate interest) | Postgres host; AWS SES |
| `app.account_deletion_requests`, `app.data_export_requests` | Request status; export file key | SEC-80/81 | Deletion: until completed. Export link: until `expires_at` | Postgres host; AWS S3 (export file) |
| `app.admin_users`, `app.audit_log` | Staff user ids, actions on user records, `ip` | Admin access control and accountability | Life of staff account; audit log has no purge yet | Postgres host |
| Application logs (Vercel, CloudWatch) | Request ids, user ids, status codes. Emails, names, prompts, tokens and photo URLs are redacted (SEC-83) | Operations | 14 days (CloudWatch); Vercel plan default | Vercel, AWS CloudWatch |
| Sentry | Error events: stack traces, user id, URL path without query string, browser/OS. Scrubbed as for logs (`@robes/logger/scrub`); `sendDefaultPii` off | Error monitoring | Sentry plan default (90 days) | Sentry |
| PostHog (EU) | User id as distinct id; catalogue events (`@robes/analytics`: ids, counts, enums); masked session replay only with `replay` consent. No email or name is sent | Product analytics, only after `analytics` consent (SEC-84) | PostHog plan default; person deleted on account deletion (SEC-80) | PostHog (EU cloud) |
| Browser storage | Session cookie (httpOnly, `robes.*`); after consent, PostHog cookie/localStorage (`ph_*`) | Sign-in; analytics identity | Session lifetime; PostHog storage is cleared on withdrawal or sign-out | None (on device) |
| Native secure storage | Session token (SecureStore) | Sign-in | Until sign-out | None (on device) |

Open items: retention for `feedback`, `waitlist`, `notifications` and `audit_log` isn't decided yet. Add a purge to `run_maintenance()` once it is, and update this table.

## 2. Processors (sub-processors)

| Processor | What they process | Region | Notes |
|---|---|---|---|
| Postgres host (Supabase DB-only / Neon / RDS, ADR-020) | All tables above | EU (`eu-west-1` preferred) | Private database behind the API; PITR in production |
| AWS: S3, CloudFront, Lambda, SQS, SES, Secrets Manager, CloudWatch | Photos and renditions, job messages (ids only), email sending and bounces, logs | `eu-west-1` (CloudFront edge is global) | ADR-021 (SES) |
| Vercel | Web app and API hosting, function logs | `dub1` functions | |
| Google (Gemini API) | Prompts, style context and the photos sent to a job | Google Cloud | Use paid-tier keys, whose prompts Google doesn't use to improve its products. Budgets and quotas are set per project |
| PostHog | Consented product analytics and masked replay | EU cloud | Loads only after consent. Enable *Discard client IP data* in project settings |
| Sentry | Scrubbed error events and traces | Configure an EU (`de`) region org | `sendDefaultPii: false` |
| Upstash | Rate-limit counters | EU (`eu-west-1`) | No payloads, only keys and counts |
| Apple, Google (sign-in) | OAuth identity for users who choose them | — | Identity providers, not storage |
| Expo, Apple APNs, Google FCM | Push tokens and notification payloads | — | Native only |
