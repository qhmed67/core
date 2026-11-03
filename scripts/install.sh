#!/bin/sh
# Thin POSIX wrapper around install.mjs.
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' "install: Node.js 18 or newer is required (node not found on PATH)" >&2
  exit 1
fi

exec node "$here/install.mjs" "$@"
