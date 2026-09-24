# @robes/mobile — Robes iOS and Android app (Expo)

React Native app on Expo SDK 57 (RN 0.86.3, React 19.2.3) with Expo Router and Uniwind (Tailwind v4 classes on shared `@robes/tokens`). It is a client of the same `/api/v1` as the web app via `@robes/api-client` — no business rules live only here.

- Spec: `../docs/mobile.md` (architecture, capabilities, store readiness).
- Scaffolded in M0 Task 14 (`../docs/plans/2026-09-24-m0-foundations.md`); native shell in M2; feature screens in M3–M6; store launch in M7.

## Running it (Expo, ADR 018)

Everything runs through Expo. There is no Xcode/Android Studio project to open, and `ios/`/`android/` are generated when needed, never edited by hand.

```bash
# from platform/
pnpm dev:mobile        # expo start: press i (iOS simulator), a (Android), or scan the QR with Expo Go
pnpm dev:ios           # straight to the iOS simulator
pnpm dev:android       # straight to an Android emulator
pnpm --filter @robes/mobile expo:doctor   # SDK/dependency health (also runs in CI)
```

- **Expo Go is the default runtime.** Uniwind's free tier and everything installed so far run in Expo Go.
- **Add native packages with `pnpm exec expo install <pkg>`** (from `mobile/`), so the version matches SDK 57, then run `expo:doctor`.
- **Only move to a dev client when you have to.** If a feature needs a module Expo Go doesn't ship (e.g. RevenueCat), switch to a development build (`pnpm exec expo run:ios` or EAS `development`), still started with `expo start`, and record it in `docs/SPEC.md` §4.
- **Tests:** `pnpm --filter @robes/mobile test` (jest-expo + React Native Testing Library; `render` is async in RNTL 14, so `await render(...)`).

## End-to-end tests (Maestro)

Flows live in `e2e/` and drive the real app in Expo Go against the local API and Mailpit.

1. Install Maestro 2.10 (needs Java): `mkdir -p ~/.maestro && cd ~/.maestro && curl -fsSL -o m.zip https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.10.0/maestro.zip && unzip -qo m.zip && rm m.zip`.
2. Boot an iOS simulator, run `pnpm dev:web` and `pnpm dev:mobile` (from `platform/`).
3. `pnpm --filter @robes/mobile e2e` (set `EXPO_PORT` if Metro isn't on 8081). Each run uses a fresh email and clears the keychain first.
