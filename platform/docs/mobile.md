# Robes Platform — Mobile (Expo) Spec

Status: **normative** for architecture; screens follow the IA in `SPEC.md` §6 and the UX requirements in `reference/ux-opportunities.md` §5.
Versions: `reference/stack-versions.md` — Expo SDK 58 (RN 0.88.0, React 19.3.0, Reanimated 4.7.1), Uniwind 1.12 on Tailwind 4.3, Expo Router.

---

## 1. Principles

1. **Same API, same rules.** The app is a client of `/api/v1` through `@robes/api-client`; it never implements business rules the web app doesn't also get from the server. If a rule is needed on both, it lives in `packages/core` (pure, tested) or on the server.
2. **Native where it matters.** Camera capture, share sheet, push, haptics, background upload, offline reading, widgets (later). Everything else mirrors web behaviour.
3. **Old versions keep working.** Installed builds live for months; API versioning (`api.md` §2) and `X-Robes-App-Version` + `426 upgrade_required` handle it. OTA updates via EAS Update for JS-only changes; native changes bump `runtimeVersion` (policy: `fingerprint`).

## 2. Project layout (`platform/mobile`)

```
mobile/
  app/                      Expo Router routes
    (auth)/sign-in.tsx, sign-up.tsx, reset.tsx
    (onboarding)/...
    (tabs)/_layout.tsx      Today · Wardrobe · Looks · Plan  (+ Create action)
    (tabs)/today/index.tsx
    (tabs)/wardrobe/index.tsx, [id].tsx, inbox.tsx, wishlist.tsx
    (tabs)/looks/index.tsx, [id].tsx
    (tabs)/plan/index.tsx, [date].tsx
    create/                 modal stack: piece → occasion → result (job screen)
    you/                    profile, style notes, preferences, deletion, export
    share/[token].tsx           share deep link handler
    +not-found.tsx
  src/
    lib/supabase.ts         supabase-js with LargeSecureStore (SecureStore key + AES ciphertext in AsyncStorage)
    lib/api.ts              @robes/api-client instance (bearer token injection, app version header)
    lib/media.ts            signed URL policy cache for expo-image
    lib/push.ts             expo-notifications registration → POST /me/push-tokens
    lib/upload.ts           resize (expo-image-manipulator) + background upload (expo-file-system) to presigned PUT
    features/*              screen-level components per domain
  global.css                tailwindcss + uniwind + @robes/tokens theme/native css
  app.config.ts             per-env config from EAS env (bundle ids, associated domains, scheme)
  eas.json                  profiles: development, preview, production; channels
```

Shared packages consumed: `@robes/tokens`, `@robes/ui-native`, `@robes/copy`, `@robes/icons`, `@robes/contracts`, `@robes/api-client`, `@robes/core`, `@robes/analytics`, `@robes/media`. React is a **peer** dependency in all shared packages (web and native both run React 19.3).

## 3. Key capabilities

| Capability | Implementation | UX requirement (ux-opportunities) |
|---|---|---|
| Auth | Supabase email/password, Google, **Sign in with Apple** (`expo-apple-authentication`), deep-link redirect `robes://auth/callback` + universal link | 2-screen onboarding |
| Capture | `expo-camera` multi-shot session (rapid capture of several pieces), camera-roll multi-select (`expo-image-picker` `allowsMultipleSelection`), on-device resize ≤3000px + HEIC→JPEG, background upload queue (resumes after app kill) → `POST /wardrobe/items/batch` → items appear as drafts that fill in as analyse jobs finish | Multi-shot + batch; one review Inbox |
| Generation | `useJob(jobId)` hook subscribes to Realtime row + broadcast; renders staged text within ~3 s, images fill progressively; job tray shows in-flight jobs across screens; local notification if app backgrounded, remote push if killed | Staged results, resumable jobs, "looks are ready" push |
| Offline | TanStack Query persisted cache (MMKV) for wardrobe, looks, artifacts, plan; delta sync via `/sync?since=`; images cached by `expo-image` disk cache with daily-stable signed URLs | Offline read |
| Sharing | `POST /shares` → native share sheet (`expo-sharing` / RN `Share`) with universal link `https://app.byrobes.com/share/<token>`; incoming links open `share/[token]` | Share sheet & deep links |
| Undo | Soft delete + toast with Undo (no confirm dialogs for reversible actions) | Undo not confirm |
| Haptics | `expo-haptics` on primary commits (save look, add piece) | |
| Accessibility | Dynamic Type respected (scale caps per token), `accessibilityLabel` lint, reduce-motion respected | a11y P0 |
| Analytics | `posthog-react-native` after consent; same event catalogue as web (`@robes/analytics`) | |
| Errors | `posthog-react-native` exception autocapture (after consent); JS only — native crashes need `@posthog/react-native-plugin` | |

Later (post-parity): home-screen widget "Today's look" (iOS WidgetKit via `expo-apple-targets`), calendar export, Live Activity for long travel generations.

## 4. Store readiness checklist (gate for M8 release)

- In-app account deletion (`/me/deletion`) — App Store 5.1.1(v).
- Sign in with Apple offered alongside Google — 4.8.
- UGC: shares are public → report action on share pages + moderation + block/unshare — 1.2.
- AI imagery of people: only the account holder's photo (SEC-22); label generated images; age rating questionnaire answered accordingly.
- Privacy nutrition labels + Play Data safety generated from `docs/data-inventory.md`.
- Permissions strings: camera, photo library (limited access supported), notifications — product-voiced copy from `@robes/copy`.
- Subscriptions (if monetised): in-app purchase via RevenueCat (`react-native-purchases`) → webhook → `entitlements`; web purchases via Stripe map to the same entitlements.
- Associated domains (`applinks:app.byrobes.com`) and Android intent filters with `assetlinks.json` served by the web app.

## 5. Build & release

- EAS Build profiles: `development` (dev client), `preview` (internal distribution, staging API), `production` (store, prod API). EAS env vars hold **public** config only (API base URL, Supabase URL + publishable key, PostHog key).
- EAS Update channels `preview` / `production`; `runtimeVersion.policy = fingerprint`.
- E2E: Maestro flows in `mobile/e2e/` (sign-in, add piece via library, generate look, save, share) run on EAS Workflows nightly and on release PRs.
- Unit/component tests: jest-expo + React Native Testing Library; shared pure packages tested with Vitest.
