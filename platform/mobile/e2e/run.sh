#!/usr/bin/env bash
# Runs the Maestro flows against Expo Go on a booted simulator with a unique test email.
set -euo pipefail
cd "$(dirname "$0")"
# Maestro's installer puts it in ~/.maestro/bin; older installs used ~/.maestro/maestro/bin.
MAESTRO="${MAESTRO_BIN:-$(command -v maestro || ls "$HOME"/.maestro/bin/maestro "$HOME"/.maestro/maestro/bin/maestro 2>/dev/null | head -1)}"
[ -x "$MAESTRO" ] || { echo "Maestro not found: curl -fsSL https://get.maestro.mobile.dev | bash" >&2; exit 1; }
# Maestro needs Java 17+. Homebrew's openjdk@17 is keg-only, so it is found here when no JDK is
# on the system path.
if [ -z "${JAVA_HOME:-}" ] && ! /usr/libexec/java_home >/dev/null 2>&1; then
  BREW_JDK="$(brew --prefix openjdk@17 2>/dev/null)/libexec/openjdk.jdk/Contents/Home"
  [ -x "$BREW_JDK/bin/java" ] || { echo "Java 17 not found: brew install openjdk@17" >&2; exit 1; }
  export JAVA_HOME="$BREW_JDK"
fi
# The flows sign in with a code read from the local Mailpit, so the app must talk to the local
# API. Expo bakes mobile/.env.local into the bundle whatever the shell sets: one pointing
# anywhere else is set aside before `expo start`.
if grep -qsE '^EXPO_PUBLIC_API_URL=https?://[^/]*byrobes' ../.env.local; then
  echo "mobile/.env.local points the app at a deployed API: rename it, then start Expo with" >&2
  echo "EXPO_PUBLIC_API_URL=http://<this Mac's LAN address>:3300 pnpm exec expo start" >&2
  exit 1
fi
# Expo Go only loads manifests from the LAN address, not 127.0.0.1.
EXPO_URL="${EXPO_URL:-exp://$(ipconfig getifaddr en0 || echo 127.0.0.1):${EXPO_PORT:-8081}}"
STATUS_URL="http${EXPO_URL#exp}/status"
for _ in $(seq 1 60); do
  curl -fs "$STATUS_URL" | grep -q 'packager-status:running' && break
  sleep 1
done
exec "$MAESTRO" test \
  -e EMAIL="maestro-$(date +%s)@test.dev" \
  -e EXPO_URL="$EXPO_URL" \
  sign-in.yaml
