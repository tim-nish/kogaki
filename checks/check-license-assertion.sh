#!/usr/bin/env bash
# The licence gate's predicate, exercised by cases (kogaki#905).
#
# WHAT THIS CATCHES. `tools/assert-licensed.sh` decides whether a change is
# licensed by a named issue, and the CI job is a thin caller of it. Before
# kogaki#905 the predicate lived inline in `.github/workflows/checks.yml`,
# where the only way to learn what it did to a given commit was to push one and
# read the result — so the two red emission commits kogaki#905 names sat on the
# default branch for two sittings with nothing obliged to notice, and the
# exemption that fixes them would have had the same property.
#
# THE CASES ARE THE TWO DIRECTIONS OF THE EXEMPTION, not one of them. A check
# that asserted only that emissions now pass would go green on a predicate that
# had stopped refusing anything at all — which is the failure mode a widened
# gate has, and the one kogaki#905 acceptance 2 asks be asserted by a case
# rather than by reading the diff. So every case below is one of:
#
#   - the exemption APPLIES and the commit passes with no #N   (arm 1)
#   - the exemption does NOT apply and the commit is refused   (arm 2, closed)
#
# WHAT IT DOES NOT VERIFY, stated rather than left to look covered: that the CI
# job passes the right facts in. The job reads `git diff-tree` and the head
# commit message and hands them over; a defect in THAT plumbing — a merge
# commit's empty path list, say — is invisible here. The predicate's own
# fail-closed handling of an empty path set is covered (case 6), which is the
# half a case can reach; the wiring stays with review.
set -euo pipefail
cd "$(dirname "$0")/.."

SCRIPT_UNDER_TEST=tools/assert-licensed.sh

if [[ ! -x "$SCRIPT_UNDER_TEST" ]]; then
  echo "FAIL: $SCRIPT_UNDER_TEST is missing or not executable."
  echo "The license-assertion CI job calls it; without it the gate cannot run."
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

failures=0
ran=0

# run_case <name> <expected: pass|refuse> <event> <message> [path...]
run_case() {
  local name="$1" expect="$2" event="$3" message="$4"; shift 4
  local paths_file="$tmp/paths"
  printf '%s\n' "$@" > "$paths_file"
  [[ $# -eq 0 ]] && : > "$paths_file"

  ran=$((ran + 1))
  local out status
  set +e
  out="$("$SCRIPT_UNDER_TEST" --event "$event" --message "$message" --paths-file "$paths_file" 2>&1)"
  status=$?
  set -e

  local got
  case "$status" in
    0) got=pass ;;
    1) got=refuse ;;
    *) got="error($status)" ;;
  esac

  if [[ "$got" != "$expect" ]]; then
    failures=$((failures + 1))
    echo "  FAIL  $name"
    echo "        expected $expect, got $got"
    echo "        output: ${out%%$'\n'*}"
  else
    echo "  ok    $name"
  fi
}

echo "license-assertion — the predicate's cases (kogaki#905):"

# --- arm 1: the exemption applies -------------------------------------------

# The defect kogaki#905 was filed for, constructed: an emission commit naming
# no issue. Reproduces `b5d96cb` and `d2dde41`, which are red on master.
run_case "an emission-only push with no #N passes" \
  pass push \
  "emit(policy): a removal list goes stale silently when the document moves" \
  "policy/emissions/2026-09-01-a-removal-list-goes-stale.md"

run_case "several emissions in one push pass" \
  pass push \
  "emit(policy): two learnings from the /ship-cycle 856 sitting" \
  "policy/emissions/2026-09-01-a.md" "policy/emissions/2026-09-01-b.md"

# --- arm 2: the exemption does not apply, and the gate still refuses ---------

# kogaki#905 acceptance 2, stated as its own case: a commit touching code with
# no issue named is still refused.
run_case "a code change with no #N is still refused" \
  refuse push \
  "fix(terrain): tighten the anchor resolver" \
  "src/terrain.mjs"

run_case "a spec change with no #N is still refused" \
  refuse push \
  "docs: rewrite the responsibility clause" \
  "specs/SPEC.md"

# The exemption must not be claimable by attaching an emission to other work.
run_case "an emission carried alongside code is refused" \
  refuse push \
  "emit(policy): a learning, and a fix" \
  "policy/emissions/2026-09-01-a.md" "src/terrain.mjs"

# An empty path set satisfies "every path matches" vacuously; it must not be
# exempted by that accident. This is what a merge commit reads as.
run_case "an empty path set is not exempt" \
  refuse push \
  "Merge branch 'x'" 

# --- the licensed paths still pass -------------------------------------------

run_case "a code change naming an issue passes" \
  pass push \
  "fix(terrain): tighten the anchor resolver (for #927) (#969)" \
  "src/terrain.mjs"

# A pull request is never exempted: its licence is read from a surface a human
# reviews, and arm 1 is scoped to `push` for that reason.
run_case "a pull request of emissions only is NOT exempt" \
  refuse pull_request \
  "emit(policy): a learning" \
  "policy/emissions/2026-09-01-a.md"

run_case "a pull request naming an issue passes" \
  pass pull_request \
  "fix: something (for #905)" \
  "src/terrain.mjs"

echo
# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661), and
# it is compared in BOTH directions (kogaki#970). Below the floor is cases
# LOST — this member would otherwise report their absence as evidence. Above it
# is cases ADDED with the floor left behind, which is green for every count in
# the gap, so the ratchet stops seeing a deletion inside it. The upward arm
# names the registry edit rather than only the fault, so the sitting that added
# a case is told what to do in the same breath as being stopped.
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'license-assertion'))
") || { echo "FAIL: could not read case_floor for license-assertion from checks/registry.json"; exit 1; }

if (( ran < FLOOR )); then
  echo "FAIL: the pass reported $ran case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
if (( ran > FLOOR )); then
  echo "FAIL: the pass reported $ran case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced in the same act, so the ratchet is $((ran - FLOOR)) behind and cannot see a case deleted inside that gap (kogaki#970). Set case_floor to $ran for 'license-assertion' in checks/registry.json, in this commit"
  exit 1
fi

if (( failures )); then
  echo "FAIL: $failures of $ran licence-predicate case(s) did not hold."
  echo
  echo "The predicate is tools/assert-licensed.sh and the CI job"
  echo "\`Change licensed by a named issue (deny-never-warn)\` is its only caller."
  echo "A refuse-case that now passes means the gate has stopped refusing"
  echo "unlicensed changes; a pass-case that now refuses means a duty the"
  echo "project states as unconditional turns the default branch red."
  exit 1
fi

echo "ok: all $ran licence-predicate case(s) hold (case_floor $FLOOR) — the emission exemption applies"
echo "    where it should and the gate still refuses an unlicensed change"
