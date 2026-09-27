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
# the client reads at build time. MKTDEV_DOMAIN (default mktdev.test) is the
# Valet authority declared to the /api browser-trust fence, so the same server
# answers on the local HTTPS domain once `valet proxy mktdev
# http://127.0.0.1:3080 --secure` is installed.
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(CDPATH= cd -- "$here/.." && pwd)
cd "$root"

DSH_CLIENT_TITLE=${DSH_CLIENT_TITLE:-MKTDEV}
export DSH_CLIENT_TITLE

MKTDEV_DOMAIN=${MKTDEV_DOMAIN:-mktdev.test}

overlay="$here/overlay.yml"

if [ "${1:-}" = "--prod" ]; then
  shift
  pnpm run build
  exec pnpm dsh web --patch "$overlay" --trusted-host "$MKTDEV_DOMAIN" "$@"
fi

# `dev:web` forwards every unrecognized argument verbatim to `dsh web`.
exec pnpm run dev:web -- --patch "$overlay" --trusted-host "$MKTDEV_DOMAIN" "$@"
