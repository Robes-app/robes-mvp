# Run the Robes app on your iPhone (Expo Go)

For working on the mobile app day to day, by hand or with Claude Code. The app on your phone talks to the **staging API at https://staging.byrobes.com**, so you don't need Docker, a local database or the web app running. You only run the app's code on your Mac and open it on your phone.

Time: about 20 minutes the first time, then one command each time.

## What you need

- A Mac on the same Wi-Fi as your iPhone (see "Different networks" below if that isn't possible).
- Access to the GitHub repo.
- **Expo Go** on your iPhone, from the App Store. It must support **Expo SDK 58**. iOS only ever offers the newest Expo Go, so when Expo ships a new SDK the phone updates first and the project has to follow (see "When it breaks").

## One-time setup

1. **Install Node 24.** The repo pins it in `platform/.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm):
   ```bash
   nvm install 24 && nvm use 24
   ```
   `node -v` should print `v24.x`.

2. **Get the code.**
   ```bash
   git clone <repo url> robes-mvp
   cd robes-mvp/platform
   ```
   Everything below runs from `platform/`.

3. **Install.**
   ```bash
   corepack enable       # gives you the pinned pnpm (11.x)
   pnpm setup:mobile     # installs packages and builds the design tokens
   ```
   If `corepack enable` complains about permissions, run `sudo corepack enable`.

4. **Install Claude Code** (optional, for vibe coding) and open it in `platform/`. It reads `platform/CLAUDE.md` and `mobile/CLAUDE.md`, which explain the codebase rules.

## Run it

```bash
pnpm dev:mobile:staging
```

A QR code appears in the terminal. Open the **Camera** app on your iPhone, point it at the QR code, and tap the banner. Expo Go opens and loads Robes. The first load takes a minute; after that it's quick.

Sign in with your email. Robes emails you a 6-digit code.

While it's running:
- Save a file and the app on your phone updates within a second or two.
- Shake the phone to open the developer menu (reload, performance monitor).
- `r` in the terminal reloads the app, `Ctrl+C` stops it.

## Things to know

- **It's the shared staging environment.** Wardrobe pieces, looks and uploads you create are real data on staging, the same data you see at https://staging.byrobes.com when signed in with the same email.
- **Your changes only affect the app, not the server.** The API runs on Vercel. Edits under `mobile/` show up instantly; edits under `app/`, `packages/api` or `db/` do nothing on your phone until they are deployed. If Claude Code proposes server changes, commit them on a branch and hand them over.
- **Some features need a real build, not Expo Go:** Sign in with Apple, native crash reporting, in-app purchases. Push notifications also need setup that hasn't been done yet. Use email sign-in.

## When it breaks

| What you see | Fix |
|---|---|
| No sign-in code arrives | Check spam. If it's still missing, the staging email service may only be allowed to send to approved addresses. Ask Niall to approve yours. |
| Expo Go: "Could not connect to the server" / spinner forever | Phone and Mac must be on the same Wi-Fi, and some office or guest Wi-Fi blocks this. Use the tunnel (next row). |
| Different networks, or the above didn't help | `pnpm dev:mobile:staging:tunnel`. The first run asks to install `@expo/ngrok`; say yes. Slower, but works across any network. |
| "Project is incompatible with this version of Expo Go" | If Expo Go's SDK is **newer** than the project's, the project needs an SDK upgrade (Expo Go can't be downgraded on iOS): ask Claude Code to upgrade `platform/mobile` to the SDK Expo Go names. If it's **older**, update Expo Go from the App Store. |
| Red error screen in the app | Read the first line. It's usually a code error from the last change. Paste it into Claude Code. |
| Something odd after pulling new code | `Ctrl+C`, run `pnpm setup:mobile`, then `pnpm dev:mobile:staging -- --clear`. |
| `node` / `pnpm` version errors | `nvm use 24`, then `corepack enable` again. |

## Working with Claude Code (house rules)

Paste these into your first message, or just make sure they're followed:

1. **Work on a branch**, never `main`: `git checkout -b founder/<what-youre-doing>`.
2. **Add native packages with Expo's installer**, from `platform/mobile`: `pnpm exec expo install <package>`, then `pnpm --filter @robes/mobile expo:doctor`. If a package isn't supported in Expo Go, don't add it; flag it instead.
3. **No colours or fonts typed in by hand.** Use the shared design tokens (`bg-surface`, `text-ink`…). A test fails if a hex colour appears in the app.
4. **On-screen words come from `@robes/copy`**, not strings written into screens.
5. **Before pushing**, run:
   ```bash
   pnpm lint && pnpm typecheck && pnpm --filter @robes/mobile test
   ```
   (The full `pnpm verify` also runs database tests, which need Docker. Skip it.)
6. Push the branch and open a pull request. Niall merges and deploys.
