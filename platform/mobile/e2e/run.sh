#!/usr/bin/env bash
# Runs the Maestro flows against Expo Go on a booted simulator with a unique test email.
set -euo pipefail
cd "$(dirname "$0")"
MAESTRO="${MAESTRO_BIN:-$HOME/.maestro/maestro/bin/maestro}"
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
