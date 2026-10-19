#!/usr/bin/env bash
# Every tracked source file stays under the bounds `.claude/policy-check.json`
# declares, unless listed there as exempt (kogaki#1457, owner decisions of
# 2026-10-08 and 2026-10-19). The numbers live in the declaration, never here;
# the measurement is the shared toolkit's `policy-check file-bound`, run with no
# paths from the repository root, and this member exits with its exit code.
#
# WHERE IT RUNS is declared here: in CI it skips by the owner's decision of
# 2026-10-19, because the tool is local-only. Everywhere else the tool is
# required, and an absent tool or an unreadable declaration fails.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "skip: the file bound is enforced by the local suite, not in CI (owner decision 2026-10-19)"
  exit 0
fi

TOOL="$HOME/.claude/tools/policy-check"
if [ ! -x "$TOOL" ]; then
  echo "FAIL: $TOOL is absent; the file bound cannot be measured without it"
  exit 1
fi

# THE FIXTURE PASS RUNS ON EVERY INVOCATION: a tool that stopped finding
# anything would otherwise read exactly like a tree within its bounds.
fixture_fail=0
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fixture() {
  local label="$1" exempt="$2" want="$3" out rc
  rm -rf "$tmp/repo" && mkdir -p "$tmp/repo/.claude"
  git -C "$tmp/repo" init -q
  printf '{"branch": "master"}\n' > "$tmp/repo/.claude/convergence.json"
  printf '{"module_max_lines": 3, "module_max_lines_exempt": %s,\n "comment_block_max_lines": 12, "comment_block_exempt": []}\n' \
    "$exempt" > "$tmp/repo/.claude/policy-check.json"
  printf 'a=1\nb=2\nc=3\nd=4\ne=5\n' > "$tmp/repo/long.sh"
  git -C "$tmp/repo" add long.sh .claude/policy-check.json
  out="$("$TOOL" file-bound --root "$tmp/repo" 2>&1)"; rc=$?
  if [ "$rc" = "$want" ] && { [ "$want" = 0 ] || grep -q '^long.sh	' <<<"$out"; }; then
    echo "  ok   $label"
  else
    echo "  FAIL $label (exit $rc, want $want): $out"
    fixture_fail=1
  fi
}
fixture "(f1) a tracked source file over module_max_lines and not exempt fails naming the file" '[]' 1
fixture "(f2) the same file listed in module_max_lines_exempt passes" '["long.sh"]' 0
if [ "$fixture_fail" != 0 ]; then
  echo "FAIL: the fixture pass did not discriminate; the tree's verdict below cannot be trusted"
  exit 1
fi
echo "fixture pass: 2/2 cases"

out="$("$TOOL" file-bound 2>&1)"; rc=$?
[ -n "$out" ] && printf '%s\n' "$out"
case "$rc" in
  0) echo "PASS: every tracked source file is within its declared bounds or listed as exempt" ;;
  1) echo "FAIL: the findings above are over the bounds .claude/policy-check.json declares" ;;
  *) echo "FAIL: policy-check exited $rc; the line above names what it could not read" ;;
esac
exit "$rc"
