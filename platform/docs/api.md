# Robes Platform — API Contract Spec

Status: **normative** for conventions (§1–§4); the endpoint catalogue (§5) is the build target, refined per milestone plan.
Legacy behaviour for every capability: `reference/legacy-api-and-ai.md` (per-route request/response, prompts, business rules, defects).

---

## 1. Shape

- Base path `/api/v1`, served by Next.js route handlers in `platform/app/src/app/api/v1/**/route.ts`.
- Every handler is created with `route()` from `packages/api`:

```ts
export const POST = route({
  auth: 'user',                                   // 'user' | 'admin' | 'public' (public requires listing in §3)
  input: GenerateLooksInput,                      // zod; body for POST/PATCH, query for GET
  output: JobAccepted,                            // zod; response validated in dev/test, typed always
  rateLimit: { key: 'looks.generate', limit: 10, window: '1m' },
  quota: { metric: 'generation.image', cost: 3 }, // checked + consumed atomically with job creation
  flag: 'looks.generate',                         // feature flag / kill switch
  handler: async ({ input, user, ctx }) => { ... },
});
```

- The contract (input/output schemas + method + path + auth) lives in `packages/contracts/src/<domain>.ts` so `packages/api-client` (web + native) is generated from the same source. An OpenAPI 3.1 document is generated at build (`pnpm --filter @robes/contracts openapi`) and published at `/api/v1/openapi.json` in non-production.

## 2. Conventions

| Topic | Rule |
|---|---|
| Auth | `Authorization: Bearer <supabase access token>` (native) **or** Supabase SSR cookies (web). Verified with `getClaims()` against JWKS. `user.id` from claims only. |
| Errors | `{ error: { code: string, message: string, details?: unknown, requestId: string } }`. Codes: `unauthenticated` 401, `forbidden` 403, `not_found` 404, `invalid_input` 400, `conflict` 409, `payload_too_large` 413, `rate_limited` 429 (+ `Retry-After`), `quota_exceeded` 429 (+ `resetAt`), `upgrade_required` 426, `capacity` 503, `disabled` 503 (kill switch), `internal` 500. Message text comes from `packages/copy` (product voice), never upstream errors. |
| Idempotency | All POSTs that create or spend accept `Idempotency-Key` header (UUID). Stored in Upstash 24 h and on `generation_jobs.idempotency_key`; replay returns the original response. Clients always send one (the api-client does it automatically). |
| Jobs | Long work returns `202 { jobId, status: 'queued' }`. Progress streams as Server-Sent Events from `GET /api/v1/jobs/:id/events` (a full job snapshot on connect and on each change; the stream ends when the job is terminal or after 5 min, and clients reconnect). One-off status via `GET /api/v1/jobs/:id`; never poll it. Cancellation `POST /api/v1/jobs/:id/cancel`. |
| Pagination | Cursor-based: `?cursor=<opaque>&limit=≤100` → `{ items, nextCursor }`. |
| Sync | `GET /api/v1/sync?since=<cursor>` returns changed rows (incl. tombstones) across user-content tables for offline caches (native). |
| Versioning | Additive changes only within v1. Breaking change → `/api/v2` route alongside; v1 supported ≥ 6 months after the last app build that uses it. Native sends `X-Robes-App-Version`; server can return `426 upgrade_required`. |
| Limits | JSON body ≤ 32 KB (SEC-32). No binary in JSON. Strings capped in schemas. |
| Headers | `X-Request-Id` echoed; `traceparent` propagated. |
| Caching | User data: `Cache-Control: private, no-store`. Public share snapshots: `s-maxage=300, stale-while-revalidate=86400`. |

## 3. Public routes (the complete list)

| Route | Protection |
|---|---|
| `GET /api/v1/health` | returns `{ ok: true }` only |
| `POST /api/v1/public/waitlist` (built) | Turnstile + 5/hour per IP + `signups` kill switch; insert-only (an existing contact is never changed) and the same 202 either way; double opt-in via the `/waitlist/confirm?t=` page (HMAC, purpose-bound token, button confirms) |
| `GET /api/v1/public/shares/:token` (built) | 128-bit token; whitelisted snapshot projected through `SharedLook`; images signed ≤2 h; IP rate limit |
| `POST /api/v1/shares/:token/report` | Turnstile + IP rate limit |
| `POST /api/v1/public/unsub/:token` (built) | HMAC token naming one user + one preference (RFC 8058 one-click, form or JSON body); IP rate limit. The `/unsubscribe?t=` page confirms before acting. |
| `POST /api/v1/webhooks/resend-inbound` | Svix signature (no shared-secret query param) |
| `POST /api/v1/webhooks/revenuecat` (M8) | Authorization header secret |

Anything else without `auth: 'user' | 'admin'` fails the route-manifest test (SEC-01).

## 4. Generation contract

Request bodies carry **intent and ids only** (SEC-16). Example:

```ts
GenerateLooksInput = z.object({
  anchor: z.discriminatedUnion('type', [
    z.object({ type: z.literal('piece'), pieceId: z.string().uuid() }),
    z.object({ type: z.literal('upload'), assetId: z.string().uuid() }),     // photo already uploaded via /uploads
    z.object({ type: z.literal('text'), text: z.string().trim().min(2).max(300) }),
    z.object({ type: z.literal('link'), url: z.string().url().max(2048) }),  // resolved by fetch worker
  ]),
  occasion: z.string().max(120).optional(),
  lockedPieceIds: z.array(z.string().uuid()).max(6).default([]),
  imageMode: z.enum(['hero_only', 'all']).default('hero_only'),               // lazy images
});
```

The worker loads profile, `style_profiles`, wardrobe, entitlements, weather (from `profiles.home_*` or a stored trip) from the DB. Output stages persisted on the job: `text` (validated JSON matching the feature's output schema) → `images[]` (asset ids as they land). The artifact is created by the worker on success; the client never posts generated content back (closes legacy `POST /api/look`).

## 5. Endpoint catalogue

Legacy route → new endpoint. "Job" = returns 202 + job.

### Identity & profile
| New | Legacy | Notes |
|---|---|---|
| `GET /me` | client REST `profiles` | profile + style summary + entitlements + flags |
| `PATCH /me` | client REST PATCH `profiles` | only user-writable fields |
| `GET /me/features` | `_RB_TRIP_HIDDEN`, `?trip=on` | the flagged doors clients show (`trips`); flags stay server-side |
| `POST /me/onboarding/complete` | client writes `onboarded_at` | server sets |
| `GET/PATCH /me/preferences` | notification_prefs, avatar_prefs, localStorage state | incl. `user_ui_state` |
| `POST /me/push-tokens`, `DELETE /me/push-tokens/:id` | — | native |
| `POST /me/deletion` · `GET /me/deletion` | — | SEC-80 |
| `POST /me/export` | — | SEC-81 |
| `GET/POST /me/consents` | — | SEC-84; append-only, latest answer per kind wins; withdrawing analytics also withdraws replay |

### Uploads & media
| New | Legacy |
|---|---|
| `POST /uploads` `{ kind, contentType, bytes ≤ 20 MB }` → `201 { assetId, upload: { method: 'PUT', url, headers, expiresAt } }` (flag `uploads`, quota `upload.image` 1, 30/min). The PUT is signed for that exact key, type and length for 5 min | `/api/wardrobe/upload` (base64 proxy) |
| `POST /uploads/:id/complete` → `Asset` (owner only). `409 conflict` until the object exists; dev renders in-process, deployed envs rely on the S3 event → `RenditionFn` | — |
| `GET /assets/:id` → `Asset` `{ status, width, height, blurhash, master, renditions[{ width, avif, webp }] }`, URLs signed for the caller (day-stable); 404 for anyone else | — |
| `POST /media/session` → web: sets CloudFront signed cookies for `/media/{userId}/*` (12 h) → `{ mode: 'cookies', expiresAt }`; local: `{ mode: 'local' }`. Native uses the signed URLs from `/assets/:id` | — |

### Wardrobe
| New | Legacy |
|---|---|
| `GET /wardrobe/items` · `POST` · `PATCH /:id` · `DELETE /:id` (soft, undoable) · `POST /:id/restore` | client REST `wardrobe_items` |
| `POST /wardrobe/items/batch` (N uploaded assets → N draft items + analyse jobs) | — (new: batch capture) |
| `GET /wardrobe/summary` (piece counts per category, for the tabs) | — |
| `POST /wardrobe/analyse` Job | `/api/wardrobe/analyse` |
| `POST /wardrobe/import-link` Job (fetch worker) | `/api/wardrobe/read-url` |
| `GET /wardrobe/taxonomy` | `/api/wardrobe/taxonomy` |
| `GET/POST/PATCH/DELETE /wishlist/items[...]` · `POST /wishlist/items/:id/promote` | client REST `wishlist_items` |
| `GET /inbox` · `POST /inbox/:id/decide` · `GET /me/inbox-address` | `wardrobe_inbox` + `/api/inbox/receipt` |
| `GET/POST/DELETE /tags[...]` | client REST `tags`, `tag_pieces` |

### Styling engines (all Jobs)
| New | Legacy |
|---|---|
| `POST /looks/generate` (key-piece styling) | `/api/style` |
| `POST /today/generate` (daily look; also produced by overnight batch) | `/api/daily` |
| `POST /travel/plan` · `POST /travel/:id/looks` · `POST /travel/:id/days/:day/restyle` | `/api/travel`, `/api/travel/looks` |
| `POST /moodboards/generate` (**deferred**: moodboards are flagged off in legacy, `_RB_MB_HIDDEN`; build only if product revives them) | `/api/moodboard` |
| `POST /looks/:id/alternates` · `POST /looks/:id/note` · `POST /looks/:id/render` | `/api/alternates`, `/api/lookbuild/note`, `/api/lookbuild/images` |
| `POST /intent` (fast path, ≤5 s, no job) | `/api/intent` |
| `POST /style/analyse` (colour + silhouette from own photos) | `/api/stylenotes/analyse` |
| `POST /style/try-on` (own photo only, SEC-22) | `/api/stylenotes/tryon` |
| `POST /avatar/render` · `GET /avatar/cells/:key` | `/api/avatar/render`, `/api/avatar/cell` |
| `GET /jobs/:id` · `GET /jobs/:id/events` (SSE) · `POST /jobs/:id/cancel` · `POST /jobs/:id/images/:idx` (generate a deferred image) · `POST /jobs/fake` (flag `jobs.fake`; platform smoke test) | `/api/images/:jobId` polling |

### Looks, artifacts, planning
| New | Legacy |
|---|---|
| `GET/POST/PATCH/DELETE /looks[...]` · `PUT /looks/:id/pieces` | client REST `looks`, `look_pieces` |
| `POST /looks/:id/wears` · `DELETE /wears/:id` | client REST `wears` |
| `GET /artifacts?type=` · `GET /artifacts/:id` · `PATCH /artifacts/:id` (title, packed/pins state) · `DELETE` (soft) | client REST `lookbook_items` + localStorage merge |
| `GET /plan?from=&to=` · `PUT /plan/days/:date` | client REST `planned_days` + client sweeps |

### Sharing
| New | Legacy |
|---|---|
| `POST /shares` `{ subjectType, subjectId }` → `{ token, url }` | client-minted `share_id` + `is_public` |
| `DELETE /shares/:token` (unshare) | — |
| `GET /shares/:token` (public) · page `/share/[token]` (RSC, OG image) | `/board/:shareId`, `/look/:id`, `/api/look/:id` |

### Feedback, notifications, growth
| New | Legacy |
|---|---|
| `POST /feedback` | `/api/feedback` (Airtable) |
| `POST /waitlist` (public) | `/api/waitlist`, `/api/instagram` |
| `GET/POST /email/unsubscribe` (public) | `/api/notify/unsub` |
| scheduler → `notify` queue (no HTTP) | in-process `notifyTick` |
| `POST /webhooks/resend-inbound` (public, signed) | `/api/inbox/receipt` |

### Admin (`auth: 'admin'`, every call writes `audit_log`)
| New | Legacy |
|---|---|
| `GET /admin/users` · `GET /admin/users/:id` · `GET /admin/generations` · `GET /admin/costs` · `PATCH /admin/flags/:key` · `POST /admin/users/:id/entitlements` | `admin.html` direct REST under `is_admin()` policies, `admin_user_overview` RPC |
