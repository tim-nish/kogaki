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
# THE SECOND DIRECTION IS NOW ALSO A DIRECTION OF TRAVEL ON THE PATH ITSELF
# (kogaki#977). The exemption argues the WRITING of an emission and reaches no
# further, so the cases assert both halves of that scope: an added or modified
# emission passes with no #N, and a DELETED one is refused. A path list carries
# statuses for exactly this reason, so the cases below are `<status> <path>`
# and a statusless line has its own case — the format's blind spot is the one
# the narrowing closes, and a check that admitted both forms could not see it.
#
# THE THIRD DIRECTION IS THE RANGE (kogaki#976). A push is an event over a
# range of commits, and the gate used to read only its head — so a push of
# [code commit naming no issue, emission commit] was exempted on the strength of
# its last commit and the code beneath it was never examined. The predicate now
# gathers the range's own facts from `--before`/`--after`, and the cases below
# build real repositories to exercise that gathering, because a two-commit push
# cannot be constructed from a path list at all.
#
# WHAT IT DOES NOT VERIFY, stated rather than left to look covered: that the CI
# job passes the right facts in. It hands `github.event.before` and
# `github.event.after` to the predicate and reads nothing itself, so the surface
# left unasserted is now the two `${{ }}` expressions rather than a `git`
# pipeline — smaller than it was, and still not nothing. The range cases reach
# everything below those two expressions; the wiring stays with review.
set -euo pipefail
cd "$(dirname "$0")/.."

# The range cases run the predicate from inside a throwaway repository, so its
# path is resolved here while the repository root is still the working
# directory — `$OLDPWD` is the caller's, not this one's.
REPO_ROOT="$PWD"
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

# report_case <name> <expected: pass|refuse> <status> <output>
# The one place a case's verdict is graded, so run_case and run_fifo_case
# cannot drift on what an exit code means.
report_case() {
  local name="$1" expect="$2" status="$3" out="$4"

  local got
  case "$status" in
    0) got=pass ;;
    1) got=refuse ;;
    *) got="error($status)" ;;
  esac

  # A REFUSAL IS GRADED ON ITS TEXT AND NOT ONLY ITS STATUS (kogaki#976, PR
  # #1011 round 1). A `set -u` abort exits 1, which is the refusal's own status,
  # so a case asserting "refused" passed over a script that had aborted before
  # reaching the arm it was asserting — which is exactly what the three
  # unreadable-range cases did until the unbound `first_foreign_why` was fixed.
  # The refusal is the gate's stated sentence; anything else exiting 1 is a
  # defect wearing the verdict's clothes.
  if [[ "$got" == refuse && "$out" != *"FAIL: no licensing issue named"* ]]; then
    got="aborted-before-the-refusal"
  fi
  if [[ "$out" == *"unbound variable"* || "$out" == *"command not found"* ]]; then
    got="shell-fault"
  fi

  if [[ "$got" != "$expect" ]]; then
    failures=$((failures + 1))
    echo "  FAIL  $name"
    echo "        expected $expect, got $got"
    echo "        output: ${out%%$'\n'*}"
  else
    echo "  ok    $name"
  fi
}

# run_case <name> <expected: pass|refuse> <event> <message> [entry...]
# An entry is `<status> <path>` — every space becomes a tab, which is the
# `git diff-tree --name-status` line the CI job passes, and a rename's second
# path is a third field. An entry with NO space is written verbatim, so a
# statusless line can be asserted as the fail-closed input it is.
run_case() {
  local name="$1" expect="$2" event="$3" message="$4"; shift 4
  local paths_file="$tmp/paths"
  : > "$paths_file"
  local entry
  for entry in "$@"; do
    printf '%s\n' "${entry// /$'\t'}" >> "$paths_file"
  done

  ran=$((ran + 1))
  local out status
  set +e
  out="$("$SCRIPT_UNDER_TEST" --event "$event" --message "$message" --paths-file "$paths_file" 2>&1)"
  status=$?
  set -e

  report_case "$name" "$expect" "$status" "$out"
}

# run_fifo_case <name> <expected> <message> [line...]
# The same predicate reached through a process substitution, whose lines are
# written verbatim. `--paths-file <(git diff-tree ...)` is how a person checks
# by hand what the gate will do before pushing, and it died at exit 2 until
# kogaki#977 with the predicate never consulted. The CI job passes a real file,
# so nothing else here would ever exercise a fifo.
run_fifo_case() {
  local name="$1" expect="$2" message="$3"; shift 3
  ran=$((ran + 1))
  local out status
  set +e
  out="$("$SCRIPT_UNDER_TEST" --event push --message "$message" \
          --paths-file <(printf '%b\n' "$@") 2>&1)"
  status=$?
  set -e
  report_case "$name" "$expect" "$status" "$out"
}

echo "license-assertion — the predicate's cases (kogaki#905, kogaki#977):"

# --- arm 1: the exemption applies -------------------------------------------

# The defect kogaki#905 was filed for, constructed: an emission commit naming
# no issue. Reproduces `b5d96cb` and `d2dde41`, which are red on master.
run_case "an emission-only push with no #N passes" \
  pass push \
  "emit(policy): a removal list goes stale silently when the document moves" \
  "A policy/emissions/2026-09-01-a-removal-list-goes-stale.md"

run_case "several emissions in one push pass" \
  pass push \
  "emit(policy): two learnings from the /ship-cycle 856 sitting" \
  "A policy/emissions/2026-09-01-a.md" "A policy/emissions/2026-09-01-b.md"

# Amending a candidate already written is still the writing of an emission —
# the same by-product of the same sitting — so M is exempt beside A.
run_case "amending an existing emission with no #N passes" \
  pass push \
  "emit(policy): sharpen a candidate written yesterday" \
  "M policy/emissions/2026-09-01-a.md"

# kogaki#977 acceptance 3: the predicate reached through a process
# substitution returns a verdict rather than dying at exit 2.
run_fifo_case "--paths-file accepts a process substitution" \
  pass \
  "emit(policy): a learning" \
  "A\tpolicy/emissions/2026-09-01-a.md"

# --- kogaki#977: the exemption does not reach a REMOVAL ----------------------

# kogaki#977 acceptance 1. Deleting a staging candidate is a deliberate act on
# the candidate, not a by-product of the sitting that wrote it, so the argument
# arm 1 rests on does not reach it and the licence is owed.
run_case "deleting an emission with no #N is refused" \
  refuse push \
  "chore: drop a stale candidate" \
  "D policy/emissions/2026-09-01-a.md"

# And the route a removal takes instead: arm 2, licensed like ordinary work.
run_case "deleting an emission naming an issue passes" \
  pass push \
  "chore(policy): retract a candidate superseded by its promotion (for #977)" \
  "D policy/emissions/2026-09-01-a.md"

# A push that writes one candidate and removes another is not a write; the
# exemption is all-paths in this direction too.
run_case "an emission added beside one deleted is refused" \
  refuse push \
  "emit(policy): replace a candidate" \
  "A policy/emissions/2026-09-01-b.md" "D policy/emissions/2026-09-01-a.md"

# A rename away from policy/emissions/ removes an emission under a status the
# exempt set does not name. `git diff-tree` reports it as D+A without `-M`;
# this asserts the predicate is right either way.
run_case "a rename out of policy/emissions/ is not exempt" \
  refuse push \
  "chore: move a candidate into the docs tree" \
  "R100 policy/emissions/2026-09-01-a.md docs/a.md"

# The format's own fail-closed arm. A caller passing `--name-only` output
# supplies no status, and the only safe reading of an unknown status is "not
# exempt" — otherwise the blind spot kogaki#977 closed reopens through the
# input rather than through the predicate.
run_case "a statusless path list is not exempt" \
  refuse push \
  "emit(policy): a learning" \
  "policy/emissions/2026-09-01-a.md"

# --- arm 2: the exemption does not apply, and the gate still refuses ---------

# kogaki#905 acceptance 2, stated as its own case: a commit touching code with
# no issue named is still refused.
run_case "a code change with no #N is still refused" \
  refuse push \
  "fix(terrain): tighten the anchor resolver" \
  "M src/terrain.mjs"

run_case "a spec change with no #N is still refused" \
  refuse push \
  "docs: rewrite the responsibility clause" \
  "M specs/SPEC.md"

# The exemption must not be claimable by attaching an emission to other work.
run_case "an emission carried alongside code is refused" \
  refuse push \
  "emit(policy): a learning, and a fix" \
  "A policy/emissions/2026-09-01-a.md" "M src/terrain.mjs"

# An empty path set satisfies "every path matches" vacuously; it must not be
# exempted by that accident. This is what a merge commit reads as.
run_case "an empty path set is not exempt" \
  refuse push \
  "Merge branch x"

# --- the licensed paths still pass -------------------------------------------

run_case "a code change naming an issue passes" \
  pass push \
  "fix(terrain): tighten the anchor resolver (for #927) (#969)" \
  "M src/terrain.mjs"

# A pull request is never exempted: its licence is read from a surface a human
# reviews, and arm 1 is scoped to `push` for that reason.
run_case "a pull request of emissions only is NOT exempt" \
  refuse pull_request \
  "emit(policy): a learning" \
  "A policy/emissions/2026-09-01-a.md"

run_case "a pull request naming an issue passes" \
  pass pull_request \
  "fix: something (for #905)" \
  "M src/terrain.mjs"

# --- kogaki#976: the push arm reads the RANGE, not the head -------------------

# run_range_case <name> <expected> <spec...>
# Each spec is `<message>|<op> <path>[;<op> <path>...]`, one commit, applied in
# order in a throwaway repository; the case then runs the predicate over
# `first-parent..HEAD` exactly as the CI job does. A real repository is the
# only way to state a two-commit push, which is what the finding is about.
run_range_case() {
  local name="$1" expect="$2"; shift 2
  local repo="$tmp/repo.$ran"
  mkdir -p "$repo"
  git -C "$repo" init -q
  git -C "$repo" config user.email c@example.com
  git -C "$repo" config user.name c

  # A base commit so `before` names something; it is outside the pushed range.
  mkdir -p "$repo/policy/emissions" "$repo/src"
  echo base > "$repo/README.md"
  git -C "$repo" add -A
  git -C "$repo" commit -qm "base (for #0)"
  local before
  before="$(git -C "$repo" rev-parse HEAD)"

  local spec msg ops op path
  for spec in "$@"; do
    msg="${spec%%|*}"
    ops="${spec#*|}"
    while [[ -n "$ops" ]]; do
      op="${ops%%;*}"
      [[ "$op" == "$ops" ]] && ops="" || ops="${ops#*;}"
      path="${op#* }"
      case "${op%% *}" in
        A|M) mkdir -p "$repo/$(dirname "$path")"; echo "$RANDOM" > "$repo/$path" ;;
        D)   rm -f "$repo/$path" ;;
      esac
    done
    git -C "$repo" add -A
    git -C "$repo" commit -qm "$msg"
  done

  local after
  after="$(git -C "$repo" rev-parse HEAD)"

  ran=$((ran + 1))
  local out status
  set +e
  out="$(cd "$repo" && "$REPO_ROOT/$SCRIPT_UNDER_TEST" --event push \
          --before "$before" --after "$after" 2>&1)"
  status=$?
  set -e
  report_case "$name" "$expect" "$status" "$out"
}

# ACCEPTANCE 1, the finding itself: the emission is last, so the head-only read
# exempted the whole push and the code commit beneath it was never examined.
run_range_case "a code commit with no #N under an emission commit is refused" \
  refuse \
  "fix(terrain): tighten the anchor resolver|M src/terrain.mjs" \
  "emit(policy): a learning from the sitting|A policy/emissions/2026-09-08-a.md"

# The same two commits in the other order — the exemption must not be reachable
# from either end of the range.
run_range_case "an emission commit under a code commit with no #N is refused" \
  refuse \
  "emit(policy): a learning from the sitting|A policy/emissions/2026-09-08-a.md" \
  "fix(terrain): tighten the anchor resolver|M src/terrain.mjs"

# ACCEPTANCE 2: a range that is emissions and nothing else is still exempt.
run_range_case "a range of emission commits only is still exempt" \
  pass \
  "emit(policy): one learning|A policy/emissions/2026-09-08-a.md" \
  "emit(policy): another learning|A policy/emissions/2026-09-08-b.md"

run_range_case "a single emission commit is still exempt" \
  pass \
  "emit(policy): one learning|A policy/emissions/2026-09-08-a.md"

# The licence is pooled across the range, which is what the `pull_request` arm
# has always done — a range licensed once on its last commit stays green.
run_range_case "a range licensed once on its last commit passes" \
  pass \
  "fix(terrain): tighten the anchor resolver|M src/terrain.mjs" \
  "fix(terrain): and its test (for #976)|M src/terrain.test.mjs"

# The union is taken over the COMMITS and not as the net diff: a source file
# touched and reverted has still been touched, and owes its licence.
run_range_case "a source file touched and reverted still owes its licence" \
  refuse \
  "wip|M src/terrain.mjs" \
  "revert wip|D src/terrain.mjs" \
  "emit(policy): a learning|A policy/emissions/2026-09-08-a.md"

# ACCEPTANCE 3, both shapes of an unreadable range. The stated arm is
# fail-closed: no exemption, and the head commit must name an issue.
run_range_case_unreadable() {
  local name="$1" expect="$2" before="$3" head_msg="$4" head_path="$5"
  local repo="$tmp/repo.$ran"
  mkdir -p "$repo"
  git -C "$repo" init -q
  git -C "$repo" config user.email c@example.com
  git -C "$repo" config user.name c
  mkdir -p "$repo/$(dirname "$head_path")"
  echo x > "$repo/$head_path"
  git -C "$repo" add -A
  git -C "$repo" commit -qm "$head_msg"
  local after
  after="$(git -C "$repo" rev-parse HEAD)"

  ran=$((ran + 1))
  local out status
  set +e
  out="$(cd "$repo" && "$REPO_ROOT/$SCRIPT_UNDER_TEST" --event push \
          --before "$before" --after "$after" 2>&1)"
  status=$?
  set -e
  report_case "$name" "$expect" "$status" "$out"
}

ZEROES=0000000000000000000000000000000000000000

# A branch's first push: `before` is all zeroes. The emission exemption does
# NOT apply, so an emission-only head with no #N is refused rather than exempt.
run_range_case_unreadable "a first push of an emission with no #N is refused" \
  refuse "$ZEROES" \
  "emit(policy): a learning" policy/emissions/2026-09-08-a.md

# And the arm it falls to is arm 2, which a named issue satisfies.
run_range_case_unreadable "a first push naming an issue passes" \
  pass "$ZEROES" \
  "emit(policy): a learning (for #976)" policy/emissions/2026-09-08-a.md

# A force push: `before` names a commit that is not in this repository at all,
# which is the same unreadable state by a different route.
run_range_case_unreadable "an unresolvable before falls to the same closed arm" \
  refuse "6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f" \
  "emit(policy): a learning" policy/emissions/2026-09-08-a.md

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
