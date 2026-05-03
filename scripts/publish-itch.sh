#!/usr/bin/env bash

# Publish Alien Orbit Assault to itch.io using the official butler CLI.
#
# Required environment variables:
#   ITCH_USER - itch.io username/org
#   ITCH_GAME - itch.io project slug
#
# Optional environment variables:
#   ITCH_CHANNEL   - default: html5
#   ITCH_VERSION   - optional user version label for this upload
#   BUILD_FIRST    - default: true; set to false to skip running build.sh
#   BUILD_SCRIPT   - default: ./build.sh
#   ARTIFACT_PATH  - default: ./alienpi-release.zip
#   BUTLER_BIN     - default: butler

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env"
fi

BUILD_SCRIPT="${BUILD_SCRIPT:-$ROOT_DIR/build.sh}"
ARTIFACT_PATH="${ARTIFACT_PATH:-$ROOT_DIR/alienpi-release.zip}"
ITCH_USER="${ITCH_USER:-}"
ITCH_GAME="${ITCH_GAME:-}"
ITCH_CHANNEL="${ITCH_CHANNEL:-html5}"
_PKG_VERSION="$(node -p "require('$ROOT_DIR/package.json').version" 2>/dev/null || true)"
ITCH_VERSION="${ITCH_VERSION:-$_PKG_VERSION}"
BUILD_FIRST="${BUILD_FIRST:-true}"
BUTLER_BIN="${BUTLER_BIN:-${HOME}/butler-darwin-arm64/butler}"

usage() {
  cat <<'EOF'
Usage:
  ITCH_USER=<username> ITCH_GAME=<project-slug> [ITCH_CHANNEL=html5] [ITCH_VERSION=x.y.z] npm run publish:itch

Publish only (version from package.json):
  npm run publish:itch

Bump version and publish in one step:
  npm run release:patch    # x.y.Z  — bug fixes
  npm run release:minor    # x.Y.0  — new features
  npm run release:major    # X.0.0  — breaking changes

Other options:
  npm run publish:itch:no-build                          # skip build step
  ITCH_VERSION=2026.05.03 npm run publish:itch           # override version label
  ITCH_CHANNEL=beta npm run publish:itch                 # target a different channel
EOF
}

if ! command -v "$BUTLER_BIN" >/dev/null 2>&1; then
  echo "Error: '$BUTLER_BIN' was not found in PATH."
  echo "Install butler from https://itch.io/docs/butler/"
  exit 1
fi

if [[ -z "$ITCH_USER" || -z "$ITCH_GAME" ]]; then
  echo "Error: ITCH_USER and ITCH_GAME are required."
  usage
  exit 1
fi

if [[ "$BUILD_FIRST" == "true" ]]; then
  echo "Running build: $BUILD_SCRIPT"
  "$BUILD_SCRIPT"
else
  echo "Skipping build because BUILD_FIRST=$BUILD_FIRST"
fi

if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "Error: Artifact not found at $ARTIFACT_PATH"
  exit 1
fi

TARGET="$ITCH_USER/$ITCH_GAME:$ITCH_CHANNEL"
CMD=("$BUTLER_BIN" push "$ARTIFACT_PATH" "$TARGET")

if [[ -n "$ITCH_VERSION" ]]; then
  CMD+=("--userversion" "$ITCH_VERSION")
fi

echo "Publishing $ARTIFACT_PATH to $TARGET"
"${CMD[@]}"

echo "Publish complete."
