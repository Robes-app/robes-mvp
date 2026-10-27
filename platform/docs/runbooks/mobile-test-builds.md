# Getting the mobile app to testers

How to put the Robes app on someone's iPhone, by how far the Apple setup has got. The founder's day-to-day route (running from source in Expo Go) is `mobile-founder-setup.md`.

## The staging API the app uses

- Vercel project `codu/robes-app`, custom environment **`staging`** (branch `beta`) → `https://staging.byrobes.com`. Health: `curl https://staging.byrobes.com/api/v1/health` → `{"ok":true}`.
- `BETTER_AUTH_URL` and `APP_URL` = `https://staging.byrobes.com` (set 2026-10-15).
- `AUTH_TRUSTED_ORIGINS` = `https://robes-app-two.vercel.app,robes://,robes-staging://,robes-dev://,exp://`. **`exp://` is what lets Expo Go sign in.** Better Auth's Expo plugin only trusts `exp://` when `NODE_ENV=development`, and Vercel runs as production. Remove `exp://` before this deployment holds real customers. Check it from a terminal:
  ```bash
  curl -s -X POST https://staging.byrobes.com/api/auth/email-otp/send-verification-otp \
    -H 'content-type: application/json' -H 'expo-origin: exp://1.2.3.4:8081' -d '{}'
  # VALIDATION_ERROR = origin accepted (good); INVALID_ORIGIN = exp:// missing
  ```
- **Sign-in codes go through SES** (`environments.md` §9). Until the account has production access it is in the SES sandbox and only delivers to verified addresses: add each tester's email under SES → Identities (eu-west-1) first.
- Vercel env changes only apply after a redeploy (`vercel redeploy <deployment> --target staging --scope codu`).

## Today: no Apple Developer account

**iPhone testers who can run code** (the founder): `pnpm dev:mobile:staging` + Expo Go. See `mobile-founder-setup.md`.

**iPhone testers who can't run code**: Expo Go can open a published update from Expo's servers (EAS Update), so nobody needs a laptop. Not set up yet. To set it up:

1. Create an Expo account and an organisation (e.g. `robes`), and add the tester as a member. Expo Go on iOS only opens updates for projects the signed-in account belongs to, so each tester needs their own Expo account in the org. Check this against Expo's current docs when setting up.
2. From `platform/mobile`:
   ```bash
   npx eas-cli login
   npx eas-cli init                          # writes extra.eas.projectId (also unlocks push in Expo Go)
   pnpm exec expo install expo-updates
   npx eas-cli update:configure              # adds updates.url + runtimeVersion
   ```
   Commit the config changes. Run `pnpm --filter @robes/mobile expo:doctor` afterwards.
3. Publish:
   ```bash
   EXPO_PUBLIC_API_URL=https://staging.byrobes.com EXPO_PUBLIC_APP_ENV=staging \
     npx eas-cli update --branch preview --message "what changed"
   ```
   `EXPO_PUBLIC_*` values are baked in when the update is built, so always set the URL on the command line. A local `mobile/.env` pointing at a LAN IP would otherwise ship.
4. The tester signs into Expo Go with their Expo account and opens the update from the project page on expo.dev (or the QR it shows).

**Android testers**: an internal APK needs no Google account. Add a `preview` profile to `eas.json` (`"distribution": "internal"`, `"android": {"buildType": "apk"}`, the staging env), then `npx eas-cli build --profile preview --platform android` and send the install link.

A free Apple ID can't distribute iOS builds. It only sideloads to a phone plugged into a Mac, and expires after 7 days.

## When the Apple Developer account exists

Enrol as an organisation; it needs a D-U-N-S number and can take a week or more.

1. App Store Connect → create the app **Robes Staging** (bundle id `com.byrobes.app.staging`). Put its Apple id in `eas.json` → `submit.staging.ios.ascAppId`.
2. Build and send to TestFlight (EAS creates the certificates and profiles when it asks):
   ```bash
   npx eas-cli build --profile staging --platform ios
   npx eas-cli submit --profile staging --platform ios --latest
   ```
3. TestFlight → Internal testing → add testers by email. They install the TestFlight app and accept the invite. No device IDs needed; builds last 90 days.
4. JS-only changes after that can ship as EAS Updates to the `staging` channel without a new build; native changes need a new build.
5. A **development build** (`eas build --profile development`) replaces Expo Go for the founder once a feature needs a native module Expo Go lacks (Sign in with Apple, RevenueCat, native crash reporting). It installs via ad hoc distribution, which needs each iPhone registered: `npx eas-cli device:create`.
