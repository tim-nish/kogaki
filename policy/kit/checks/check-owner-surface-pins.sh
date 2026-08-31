#!/usr/bin/env bash
# Owner-surface pin tokens — THE FAST PATH, and it says so on every run
# (kogaki#320; contract specs/spec-client-kit/SPEC.md §8.3).
#
# WHAT THIS IS FOR. A consultation used to reach the owner as a pin block —
# `consulted: <repo>@<sha> <file>:<line>`, `request_id:` — which tells them
# exactly one thing, that a consultation happened, and nothing they can act on.
# §8 replaces that with Question / Answer / Conclusion and keeps the pin
# machine-facing. This member refuses the tokens on the owner render surface.
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN. The cases live with the
# composer they cover, in `gateway-query.mjs --self-test`, because they are pure
# functions of a served response and a test needing a live substrate could not
# run in CI at all. That is the same arrangement `check-client-kit-install.sh`
# uses, and its registry record already states the reason.
#
# WHAT THIS IS NOT, AND THE OUTPUT SAYS SO UNCONDITIONALLY. It is a lexicon
# grep, and the served position is exact about how far one reaches:
#
#   "grep the known internal vocabulary at the boundary; but that grep covers
#    only the coined-identifier sub-class, and the wider class is text internal
#    in REGISTER while made of ordinary words, which no denial list can reach
#    because deletion cannot cross registers — that half needs a positive
#    admission test at one typed owner-surface seam, with the lexicon grep
#    demoted to a fast path there."
#   product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:63
#
# `consulted:`, `request_id:` and `@<sha>` ARE coined identifiers, so this
# reaches its sub-class and no further. A rendering that strips every one of
# them and still reads as an audit artifact passes here and FAILS §8. Story
# 1.50 AC5 makes presenting this as complete coverage a criterion failure,
# which is why the disclosure prints on a PASS as well as a failure: a check
# that announced its limit only when it fired would be silent in exactly the
# state that misleads.
#
# THE POSITIVE ADMISSION TEST IS specs/spec-client-kit/SPEC.md §7 q4 — a NAMED
# SLOT, not an omission. Filling it is its own decision act.
set -uo pipefail
# REPO ROOT, RESOLVED BY GIT RATHER THAN BY DEPTH (kogaki#724). This check is
# kit-held and a consumer may vendor the kit at a path of its own choosing, so
# a `dirname "$0"/..` hop would bind the file to one layout. `--show-toplevel`
# is depth-independent and is the only resolution that survives relocation.
cd "$(git rev-parse --show-toplevel)" || {
  echo "FAIL: not inside a git repository — this check resolves the repo root with git"
  exit 1
}

echo "== owner-surface pin tokens (fast path)"

FAIL=0
OUT=$(node policy/kit/bin/gateway-query.mjs --self-test 2>&1) || FAIL=1
printf '%s\n' "$OUT" | grep -q 'owner-register cases' || {
  echo "FAIL: the owner-register fixture pass did not run — the cases live with the composer and this member only invokes them"
  FAIL=1
}
if [[ $FAIL -ne 0 ]]; then
  printf '%s\n' "$OUT" | tail -20
else
  printf '%s\n' "$OUT" | grep 'owner-register cases'
  echo "ok: the owner rendering carries Question, a readable Answer and the agent's Conclusion slot, and no pin-shaped token"
fi


# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
# checks/registry.json is the one source: a number transcribed into this file
# would be the unbound-prose defect the floor exists to close, in a second
# place. The EXTRACTION is this member's own, per the note's rule — the four
# delegating members print their counts in three grammars, and imposing one
# grammar on four runtimes would be a spec decision about check plumbing paid
# for by edits to three unrelated files.
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'owner-surface-pins'))
") || { echo "FAIL: could not read case_floor for owner-surface-pins from checks/registry.json"; exit 1; }
N=$(sed -n 's/.*fixture pass: \([0-9][0-9]*\)\/[0-9][0-9]* owner-register cases.*/\1/p' <<<"$OUT" | head -1)
# FALL THROUGH, never exit: this member's scope disclosure below is declared
# UNCONDITIONAL (story 1.50 AC5, and the admission record's own words — "the
# member's scope is declared in its own output on every run, pass included").
# An early exit here would make it conditional, which is why the failures
# above it set FAIL=1 rather than exiting, and why these do too.
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  FAIL=1
elif (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  FAIL=1
else
  echo "ok: owner-register fixture pass ran ${N} case(s) clean, at or above its declared floor of ${FLOOR}"
fi

# UNCONDITIONAL, per story 1.50 AC5.
cat <<'EOF'
reach of this check, stated rather than implied: it is a LEXICON GREP over
coined identifiers (consulted:, request_id:, @<sha>) applied to the owner render
composer, and it covers that sub-class ONLY. Text that is machine-facing in
REGISTER while made of ordinary words passes here and still violates
specs/spec-client-kit/SPEC.md §8. The positive admission test that would reach
it is §7 q4 — a named slot, not built. This member is the fast path beneath it.
not carried here: every OTHER owner surface in this repository. The composer is
the one enumerated surface, and an enumeration is what the served line above
warns goes stale — which is the second reason this is the fast path and not the
remedy.
also not carried here: whether the Answer text is a faithful rendering of what
the surface served — judgment, and it stays in the review lane.
EOF
exit $FAIL
