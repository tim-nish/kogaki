#!/usr/bin/env bash
# THE DECLARED CI SHAPE (kogaki#1182).
#
# THE CONCRETE EVENT. On 2026-09-22 a `/ship-cycle 1172` session wanted to run
# the registered suite the way CI runs it -- no gateway, no `claude` on PATH
# -- and had to compose that shape by hand: a directory of symlinks for a
# handful of binaries, PATH pointed at it. The first attempt omitted `node`,
# so the suite failed for a reason unrelated to the change under review and
# the run established nothing. Nothing in `tools/run-registered-checks.sh` or
# `.github/workflows/checks.yml` declared what the shape WAS, so the session
# guessed, and a wrong guess produced a red suite that read as a finding.
#
# THIS FILE IS THAT DECLARATION, made once so a guess is never owed again.
# `tools/run-registered-checks.sh --ci-shape` sources it; the binaries it
# names are exactly the ones `.github/workflows/checks.yml`'s registered-checks
# job provides: `node`, `npm`, `npx` and `corepack` from the `actions/setup-node`
# step, and the base `ubuntu-latest` runner image's own shell tools --
# enumerated here, once, as the set this repository's checks are actually
# observed to invoke (grepped from `checks/*.sh`, `tools/*.sh` and
# `policy/kit/checks/*.sh`), not transcribed from the runner image's full
# manifest. `.github/workflows/checks.yml` cites this file by name rather than
# repeating the list, so the two cannot drift apart silently the way the
# hand-built symlink directory and the real job once could.
#
# WHAT IS DELIBERATELY ABSENT. `claude` is not on this list -- that absence is
# the whole point of the shape, named in the issue title: a session runs with
# `claude` on PATH by construction, and a check or fixture that leans on it
# unguarded passes locally and would fail in CI, invisibly, until this shape
# made that failure reachable outside CI.
#
# consulted: product-lab@9c07d0bd10ba39d2f0bf2a0bf48370373f48ace5 coding::lesson/a-guarantee-can-live-in-environment-conjuncts-not-code@54e8adf24e603afde73b106db13e215a1a320fa120447927545b363b8a764b7f
CI_SHAPE_BINARIES=(
  # actions/setup-node
  node npm npx corepack
  # the base runner image's shell -- observed uses only, per the header above
  bash sh env
  git gh python3 jq
  cat ls mkdir rm mv cp chmod touch ln
  find grep sed awk cut sort uniq tr wc xargs diff paste column comm
  head tail dirname basename realpath readlink stat
  mktemp md5sum sha256sum date seq timeout which
  ps kill sleep printf tee gzip tar cmp expr
  true false test
)

# ci_shape_apply -- build the shape and export it into THIS shell.
#
# Must be CALLED DIRECTLY, never through a `$(...)` command substitution: a
# command substitution runs in a SUBSHELL, and every `export` below would die
# with it, leaving the caller's own PATH (and gateway, and force flag)
# untouched -- the exact bug this note exists to keep from coming back. The
# built directory is left in the global `CI_SHAPE_DIR` for that reason, not
# only printed: a caller that sources this file and calls `ci_shape_apply`
# plainly gets the mutation in its own shell for free. A caller that DOES want
# an isolated build (to compare PATHs without touching its own, as
# `checks/check-ci-shape.sh` does) still may wrap the call in `$(...)` --
# that caller is choosing the subshell and its own isolation, not asking this
# function to escape one.
#
# This file owns no cleanup trap of its own for `CI_SHAPE_DIR`: a sourced
# script does not know whether it is the only occupant of the caller's EXIT
# trap, so the caller folds the directory into its own.
CI_SHAPE_DIR=""
ci_shape_apply() {
  local dir
  dir="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-ci-shape.XXXXXX")"
  local name found
  for name in "${CI_SHAPE_BINARIES[@]}"; do
    found="$(command -v "$name" 2>/dev/null || true)"
    # A DECLARED BINARY THIS MACHINE DOES NOT HAVE IS SIMPLY ABSENT FROM THE
    # SHAPE, not an error here: the same gap exists in real CI whenever a
    # runner image drops a tool, and the members that need it fail by name
    # there too, which is the behaviour this mode exists to reproduce.
    [[ -n "$found" ]] || continue
    ln -s "$found" "$dir/$name"
  done
  CI_SHAPE_DIR="$dir"
  export PATH="$dir"
  # A NONEXISTENT PATH, NAMED AS SUCH -- the policy seam degrades (kit exit 11)
  # rather than silently finding a real gateway this machine happens to have
  # configured. CI itself never sets this variable, so this is CI's own
  # reachability, reproduced rather than merely approximated.
  export TSUREZURE_GATEWAY_JS="/nonexistent/kogaki-ci-shape-gateway.js"
  # CHECKS_FORCE=1 SEMANTICS (kogaki#1182 item 2): a --ci-shape run answers a
  # question about THIS shape, so a verdict cached from a full-tool run at the
  # same head must never stand in for it, and vice versa -- see CI_SHAPE below
  # and its read in tools/run-registered-checks.sh.
  export CHECKS_FORCE=1
  export CI_SHAPE=1
  printf '%s\n' "$dir"
}
