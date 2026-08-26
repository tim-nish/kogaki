#!/usr/bin/env bash
# The Terrain runtime's fixture pass (kogaki#659).
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN — the same arrangement the
# registered sibling check-draft-runtime.sh uses, and for the same reason: the
# cases live with the runtime they cover, in `terrain/terrain.mjs self-test`,
# because they are functions of the runtime's own composers, grammar and
# executor and drive them end to end. Seam-free by construction: every case
# constructs its own inputs, so the pass reaches no gateway and no network,
# and writes only into a scratch directory it removes.
#
# WHAT THE PASS ASSERTS (18 cases at admission): the composed-form identity
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
# composition over records in the tree — that is check-terrain-composition.sh,
# whose admission record and removal signal are about that contract, and
# widening it to also carry runtime fixtures would put two contracts behind one
# removal signal. And every judgment about whether a case is a GOOD
# counterfactual, which the registry's own note puts outside every gate.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== terrain runtime fixture pass (kogaki#659)"

OUT=$(node terrain/terrain.mjs self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "terrain self-test:" <<<"$OUT"; then
  echo "FAIL: the runtime's fixture pass did not run clean — the cases live with the runtime and this member only invokes them"
  exit 1
fi

# The vacuous-pass guard, and it is the invoker's own concern rather than a
# widening: `0 case(s) pass` exits 0 and prints the token, so a pass whose
# cases were deleted rather than broken would go green through both tests
# above — the member would then assert the presence of evidence that no longer
# exists, which is the state kogaki#659 was filed about, one level down.
N=$(sed -n 's/^terrain self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" || "$N" -lt 1 ]]; then
  echo "FAIL: the fixture pass reported no cases — a pass carrying zero cases is not evidence, and this member would otherwise report it as one"
  exit 1
fi
echo "ok: terrain runtime fixture pass ran ${N} case(s) clean"
exit 0
