#!/usr/bin/env sh
# MKTDEV launcher.
#
# Applies the MKTDEV brand over a checkout that stays identical to upstream:
# nothing outside this directory is modified, so `master` rebases cleanly.
#
#   ./mktdev/launch.sh              build, serve, and rebuild on source edits
#   ./mktdev/launch.sh --prod       full build, then serve once
#   ./mktdev/launch.sh --port 3081  extra arguments go to `dsh web`
#
# Override the window title with DSH_CLIENT_TITLE, the public build variable
# the client reads at build time.
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(CDPATH= cd -- "$here/.." && pwd)
cd "$root"

DSH_CLIENT_TITLE=${DSH_CLIENT_TITLE:-MKTDEV}
export DSH_CLIENT_TITLE

overlay="$here/overlay.yml"

if [ "${1:-}" = "--prod" ]; then
  shift
  pnpm run build
  exec pnpm dsh web --patch "$overlay" "$@"
fi

# `dev:web` forwards every unrecognized argument verbatim to `dsh web`.
exec pnpm run dev:web -- --patch "$overlay" "$@"
