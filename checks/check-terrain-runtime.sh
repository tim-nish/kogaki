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
# refusal; and JUDGMENT PROVENANCE (kogaki#892) — that neither owner surface
# renders a judgment the Harness never observed, that the observed form stays
# composable so the repair is a split rather than a blanket downgrade, and that
# the grammar admits both forms of both lines.
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
# THE UPWARD ARM (kogaki#970). Below the floor is cases LOST; above it is
# cases ADDED with the floor left behind, and until this arm existed the two
# were the same silence — `N < FLOOR` is green for every N above the floor, so
# a floor that fell 13 behind on this suite detected nothing in the gap.
# It names the edit rather than only the fault, which is the whole answer to
# the registry note's original objection that an exact count "turns every
# legitimate new case into a failing check": the sitting that added the case
# is told what to do in the same breath as being stopped.
if (( N > FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced in the same act, so the ratchet is $((N - FLOOR)) behind and cannot see a case deleted inside that gap (kogaki#970). Set case_floor to $N for 'terrain-runtime' in checks/registry.json, in this commit"
  exit 1
fi

# ---- THE ACT ARM (kogaki#1026). The self-test above drives the composer the
# empty-survey refusal is made of; this arm drives the ACT, because what failed
# on 2026-09-09 was not the composer — it answered correctly — but the caller,
# which printed the answer and carried on into the tag gate. A case over the
# composer alone would have been green through the whole incident.
#
# SEAM-FREE, like every case above it. The arm builds a scratch REPO — `src/`
# copied whole, plus a STUB `policy/kit/bin/gateway-query.mjs` that prints the
# miss shape — so `terrain survey` reaches no gateway and no network. `REPO` is
# the parent of `src/`, which is what makes the substitution a copy rather than
# a patch to the runtime.
echo "== the empty-survey refusal, driven as an act (kogaki#1026)"
SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT
mkdir -p "$SCRATCH/policy/kit/bin"
cp -R src "$SCRATCH/src"
cat > "$SCRATCH/policy/kit/bin/gateway-query.mjs" <<'STUB'
// The miss shape, verbatim in the fields the survey reads: no records, a pin.
process.stdout.write(JSON.stringify({
  miss: true, tool: "element_survey", pin: "product-lab@f1x7ure", lines: [],
}) + "\n");
STUB

SURVEY_OUT=$(cd "$SCRATCH" && node src/terrain.mjs survey 2>&1); SURVEY_RC=$?
printf '%s\n' "$SURVEY_OUT"
if [[ $SURVEY_RC -eq 0 ]]; then
  echo "FAIL: survey exited 0 over a miss-shape response — an empty survey is a refusal (kogaki#1026), and a zero exit is what let the executor advance to the tag gate"
  exit 1
fi
if ! grep -q "0 served line(s)" <<<"$SURVEY_OUT"; then
  echo "FAIL: the refusal does not name the served-line count, which is half of what tells the call apart from the corpus"
  exit 1
fi
if ! grep -q "pin product-lab@f1x7ure" <<<"$SURVEY_OUT"; then
  echo "FAIL: the refusal does not name the pin, so an operator cannot ask a second surface at the same pin — the one check that distinguishes the two causes"
  exit 1
fi
# `runs/` UNTOUCHED is asserted as ABSENCE, not as emptiness: `runDir` creates
# and prunes, so a directory that exists at all means the refusal ran after a
# write it was supposed to precede.
if [[ -e "$SCRATCH/runs" ]]; then
  echo "FAIL: the refusal left $SCRATCH/runs behind — it must fire before the run directory is taken, not after"
  exit 1
fi
echo "ok: the empty-survey refusal exits non-zero, names served lines and pin, and touches no run store"

echo "ok: terrain runtime fixture pass ran ${N} case(s) clean, exactly at its declared floor of ${FLOOR}"
exit 0
