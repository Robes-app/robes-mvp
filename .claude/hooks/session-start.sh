#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Why this exists (2026-09-15): the remote environment restores a container
# snapshot whose local `beta` checkout can be DAYS behind origin/beta — a
# session then builds on a stale base and its push is rejected as
# non-fast-forward (it happened twice). This hook fetches the remote and
# resets the working branch to the remote tip BEFORE any work begins, then
# installs the dependencies the harnesses need.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

BRANCH="${ROBES_WORK_BRANCH:-beta}"

# 1. The working branch tracks the remote tip. Only a CLEAN tree is reset —
#    a resumed session with uncommitted work keeps it, and says so.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git fetch origin "$BRANCH" 2>/dev/null; then
    if [ -z "$(git status --porcelain)" ]; then
      git checkout -q -B "$BRANCH" "origin/$BRANCH"
      echo "[session-start] $BRANCH reset to origin/$BRANCH ($(git rev-parse --short HEAD))"
    else
      echo "[session-start] working tree has changes — left $BRANCH as is ($(git rev-parse --short HEAD)); origin/$BRANCH is $(git rev-parse --short "origin/$BRANCH")"
    fi
  else
    echo "[session-start] could not fetch origin/$BRANCH — continuing on $(git rev-parse --short HEAD)"
  fi
fi

# 2. Dependencies: the app's own (express, @google/genai, dotenv) plus
#    playwright for the regression harnesses (scripts/*_harness.mjs,
#    scripts/*_smoke.mjs). Idempotent; npm install reuses the cached tree.
npm install --no-audit --no-fund
npm install --no-save --no-audit --no-fund playwright

# 3. The harnesses need Chromium. The container ships one under
#    PLAYWRIGHT_BROWSERS_PATH — point CHROME_PATH at it so no download runs.
CHROME=""
for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome /opt/pw-browsers/chromium; do
  if [ -x "$c" ]; then CHROME="$c"; break; fi
done
if [ -n "$CHROME" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export CHROME_PATH=\"$CHROME\"" >> "$CLAUDE_ENV_FILE"
  echo "[session-start] CHROME_PATH=$CHROME"
fi

echo "[session-start] ready"
