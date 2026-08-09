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
cd "$(dirname "${BASH_SOURCE[0]}")/.."

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
