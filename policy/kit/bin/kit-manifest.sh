#!/usr/bin/env bash
# The kit manifest digest — ONE implementation, two callers (kogaki#795).
#
# `install.sh` WRITES this digest into a consumer's `policy/kit/.kit-version`
# and `checks/check-kit-currency.sh` RECOMPUTES it to verify the copy. A digest
# whose writer and verifier each carried their own implementation would compare
# two algorithms rather than two trees, and every disagreement would read as
# drift in the copy. So the algorithm lives here and neither caller restates it.
#
# usage: kit-manifest.sh <kit-dir>
# prints: the sha256 hex digest, or exits 1 with a reason on stderr.
#
# WHAT IS DIGESTED, stated because the exclusions are the whole contract:
#   * every regular file under <kit-dir>, by path relative to <kit-dir>;
#   * EXCEPT `.kit-version` itself — a stamp containing its own digest cannot
#     be verified, and a stamp excluded from its own manifest can;
#   * EXCEPT `consumers.json` — it is Home-side state that changes when a
#     consumer is added, and a consumer's copy must not go stale because the
#     Home gained a neighbour.
# Paths are sorted with LC_ALL=C so the digest does not depend on the locale of
# whichever machine ran the install.
set -euo pipefail

KIT="${1:-}"
[[ -n "$KIT" && -d "$KIT" ]] || { echo "kit-manifest: no such kit directory: ${KIT:-<empty>}" >&2; exit 1; }

command -v sha256sum >/dev/null 2>&1 || { echo "kit-manifest: sha256sum not available" >&2; exit 1; }

cd "$KIT" || exit 1
# -print0/-z throughout: a path with a newline would otherwise split into two
# entries and silently change the digest.
find . -type f \
     ! -name '.kit-version' \
     ! -path './consumers.json' \
     -print0 \
  | LC_ALL=C sort -z \
  | xargs -0 -r sha256sum \
  | sha256sum \
  | cut -d' ' -f1
