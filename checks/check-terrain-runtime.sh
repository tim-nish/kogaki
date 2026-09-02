#!/usr/bin/env bash
# The Terrain runtime's fixture pass (kogaki#659).
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN — the same arrangement the
# registered sibling check-draft-runtime.sh uses, and for the same reason: the
# cases live with the runtime they cover, in `src/terrain.mjs self-test`,
# because they are functions of the runtime's own composers, grammar and
# executor and drive them end to end. Seam-free by construction: every case
# constructs its own inputs, so the pass reaches no gateway and no network,
# and writes only into a scratch directory it removes.
#
# WHAT THE PASS ASSERTS (the count is `case_floor` in the registry, and is
# not restated here — kogaki#661): the composed-form identity
# cite (kogaki#612) — lesson and journey kinds in the join key, a bare sha
# pin taken as served, an absent pin refusing composition rather than minting
# an unpinned cite, and the positional form unproducible by the composer; the
# abbreviated-form classification repair (kogaki#653, PR #658) — both surfaces
# admitting the ABNORMAL line their own emitter produces, with the digit-free
# tail kept as the control that the fix is not a widening; and the §15 control
# plane (kogaki#652) — the shipped table loading under the structural rules,
# run counts read from a record alone with conditional entries counted apart,
# and the executor's six refusals (no states, duplicate state id, an
# uninterpreted kind, a write state naming no artifact, a table with no
# terminal state, a write state with no renderer) plus the input-without-wait
# refusal.
#
# WHY THIS MEMBER EXISTS, stated rather than implied: all of the above was
# present, correct and observed by nothing. No registered check invoked the
# pass, and the one terrain member — terrain-composition — spawns `cotags`
# only, so every assertion above was unenforced and a future edit re-broke any
# of them with no CI signal. That is the same shape as the defect PR #658
# repaired one level down: a guard whose condition never arises leaves no
# trace of having been missing.
#
# NOT CARRIED HERE, stated rather than implied: survey/cover/figure/navigation
# composition over records in the tree. That WAS check-terrain-composition.sh,
# whose admission record and removal signal were about that contract, and
# widening this member to also carry runtime fixtures would have put two
# contracts behind one removal signal.
#
# THAT MEMBER IS GONE (kogaki#770): removed under the 2026-09-02 retention rule
# with 0 catches over 120 exercised runs at 20.5 s local. So the contract named
# above is now carried by NOBODY, and this paragraph says so rather than
# continuing to point at a file that is not in the tree — a boundary stated by
# naming its other side stops being legible the moment that side is deleted.
# This member is NOT widened to absorb it: the reason the split existed is
# unchanged, and absorbing a contract because its carrier was removed for
# having no catches would re-admit the cost the removal took, behind a member
# whose own removal signal is about something else. And every judgment about whether a case is a GOOD
# counterfactual, which the registry's own note puts outside every gate.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== terrain runtime fixture pass (kogaki#659)"

OUT=$(node src/terrain.mjs self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "terrain self-test:" <<<"$OUT"; then
  echo "FAIL: the runtime's fixture pass did not run clean — the cases live with the runtime and this member only invokes them"
  exit 1
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
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'terrain-runtime'))
") || { echo "FAIL: could not read case_floor for terrain-runtime from checks/registry.json"; exit 1; }
N=$(sed -n 's/^terrain self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
echo "ok: terrain runtime fixture pass ran ${N} case(s) clean, at or above its declared floor of ${FLOOR}"
exit 0
