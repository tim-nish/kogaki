#!/usr/bin/env bash
# The install vendors a stamped copy of policy/kit/ into the consumer
# (kogaki#1120; contract specs/spec-client-kit/SPEC.md §10.2).
#
# `policy/kit/install.sh --repo <fresh dir> --consumer x` is run against a
# throwaway repository, under the same sandboxed HOME and claude-CLI shim
# `policy/kit/test/install-test.sh` already uses (kogaki#638, kogaki#787) —
# a bare install must not touch the operator's own `~/.claude.json` or start
# the real CLI, and this member is a second caller of install.sh, not a
# second author of that guard. `policy/kit/test/install-test.sh` itself is
# NOT changed by this check (thread comment 2, 2026-10-02).
#
# FOUR ASSERTIONS, each naming the acceptance item it discharges:
#   1. the copy exists — policy/kit/bin/gateway-query.mjs, checks/,
#      templates/, skills/, install.sh and .kit-version are all in place.
#   2. `policy/kit/bin/kit-manifest.sh` over the copy equals the manifest
#      over this repository's own policy/kit/ (the install's SOURCE).
#   3. `.kit-version` records that digest with THIS repository's slug and
#      revision — the two fields install.sh's step 7 derives from
#      `git config --get remote.origin.url` and `git rev-parse HEAD` run
#      against the Home, read back here the same way rather than restated.
#   4. the copy carries no `consumers.json` — that file is Home-side state
#      (kit-manifest.sh excludes it from the manifest for the same reason).
set -euo pipefail

CHECK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$CHECK_DIR" rev-parse --show-toplevel 2>/dev/null)" || {
  echo "FAIL: cannot resolve the repository root from this check's location"
  exit 1
}
KIT_DIR="$ROOT/policy/kit"

fail() { echo "FAIL: $*" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Sandboxed HOME (kogaki#638) — install.sh step 5 reads/writes
# $HOME/.claude.json, and this check must not touch the operator's own.
export HOME="$TMP/home"
mkdir -p "$HOME"
[[ "$HOME" == "$TMP/home" ]] || fail "install sandbox HOME is not set"
unset TSUREZURE_GATEWAY_JS

# The claude CLI is a test double (kogaki#787) — no live MCP registration.
mkdir -p "$TMP/shim"
cat > "$TMP/shim/claude" <<'SHIM'
#!/usr/bin/env bash
exit 0
SHIM
chmod +x "$TMP/shim/claude"
export PATH="$TMP/shim:$PATH"
[[ "$(command -v claude)" == "$TMP/shim/claude" ]] \
  || fail "the claude shim is not first on PATH — this check would start the real CLI"

mkdir -p "$TMP/repo"
"$KIT_DIR/install.sh" --repo "$TMP/repo" --consumer x >"$TMP/out" 2>&1 \
  || fail "install.sh exited non-zero: $(cat "$TMP/out")"

COPY="$TMP/repo/policy/kit"

# 1. The copy exists — acceptance item 1.
[[ -f "$COPY/bin/gateway-query.mjs" ]] || fail "no policy/kit/bin/gateway-query.mjs in the vendored copy"
[[ -d "$COPY/checks" ]] || fail "no policy/kit/checks/ in the vendored copy"
[[ -d "$COPY/templates" ]] || fail "no policy/kit/templates/ in the vendored copy"
[[ -d "$COPY/skills" ]] || fail "no policy/kit/skills/ in the vendored copy"
[[ -f "$COPY/install.sh" ]] || fail "no policy/kit/install.sh in the vendored copy"
[[ -f "$COPY/.kit-version" ]] || fail "no policy/kit/.kit-version in the vendored copy"

# 4. No consumers.json in the copy — Home-side state, never vendored.
[[ ! -f "$COPY/consumers.json" ]] || fail "the vendored copy carries consumers.json — Home-side state leaked into a consumer"

# 2. The manifest agrees — acceptance item 2's first half.
SOURCE_MANIFEST="$(bash "$KIT_DIR/bin/kit-manifest.sh" "$KIT_DIR")" || fail "cannot compute the source manifest"
COPY_MANIFEST="$(bash "$KIT_DIR/bin/kit-manifest.sh" "$COPY")" || fail "cannot compute the copy manifest"
[[ "$SOURCE_MANIFEST" == "$COPY_MANIFEST" ]] \
  || fail "the vendored copy's manifest (${COPY_MANIFEST:0:12}) does not match the source's (${SOURCE_MANIFEST:0:12})"

# 3. .kit-version records that digest with this repository's slug and
#    revision — acceptance item 2's second half.
STAMP="$COPY/.kit-version"
STAMPED_MANIFEST="$(sed -n 's/^manifest:[[:space:]]*//p' "$STAMP" | head -1)"
STAMPED_HOME="$(sed -n 's/^home:[[:space:]]*//p' "$STAMP" | head -1)"
STAMPED_REV="$(sed -n 's/^home_revision:[[:space:]]*//p' "$STAMP" | head -1)"

[[ "$STAMPED_MANIFEST" == "$SOURCE_MANIFEST" ]] \
  || fail ".kit-version records manifest ${STAMPED_MANIFEST:0:12}, not the source's ${SOURCE_MANIFEST:0:12}"

EXPECT_HOME_SLUG="$(git -C "$ROOT" config --get remote.origin.url 2>/dev/null \
  | sed -e 's#\.git$##' -e 's#.*[:/]\([^/]*/[^/]*\)$#\1#' || true)"
[[ -n "$EXPECT_HOME_SLUG" ]] || EXPECT_HOME_SLUG="unknown-home"
[[ "$STAMPED_HOME" == "$EXPECT_HOME_SLUG" ]] \
  || fail ".kit-version records home $STAMPED_HOME, expected $EXPECT_HOME_SLUG"

EXPECT_HOME_REV="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
HOME_DIRTY="$(git -C "$KIT_DIR" status --porcelain -- . 2>/dev/null || true)"
[[ -n "$HOME_DIRTY" ]] && EXPECT_HOME_REV="${EXPECT_HOME_REV}-dirty"
[[ "$STAMPED_REV" == "$EXPECT_HOME_REV" ]] \
  || fail ".kit-version records home_revision $STAMPED_REV, expected $EXPECT_HOME_REV"

echo "ok: install.sh vendors a stamped policy/kit/ copy ($STAMPED_HOME@${STAMPED_REV:0:12})"
