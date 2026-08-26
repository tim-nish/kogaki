#!/usr/bin/env bash
# Terrain's §15 control plane, counted against its own workflow table
# (kogaki#654 acceptance items 2 and 6; story 1.91).
#
# WHAT THIS MEMBER CARRIES, and it is the half nothing else does. The runtime's
# `run --status` RENDERS a run's counts beside the baseline DERIVED from the
# table's states array and the table's own hand-written `counted_baseline`, and
# says so in its own closing line: "the check story 1.91 registers is what
# judges a disagreement, not this read". This is that check. A `counted_baseline`
# that drifts from the states array beside it is a denominator asserting a shape
# the table no longer has — the class kogaki#659 named one level over, here in
# the one artifact whose whole job is to be the denominator.
#
# TWO BLOCKS, and the split is the coverage statement rather than an
# arrangement:
#
#   1. THE SHIPPED TABLE. A run is driven far enough to leave a record, then
#      `run --status` is read and any DISAGREES line FAILS. This is the block
#      that covers `owner_artifact_writes`, because only the shipped table has
#      write states with renderers bound to them.
#
#   2. THE EVOLVABILITY FIXTURE (`checks/fixtures/terrain/workflow/evolved.json`).
#      A table that MOVES A HANDOFF (its first wait is its first state, where
#      the shipped table's is third) and ADDS AN ENTRY POINT (`reconsider`,
#      an id no executor line names) is driven END TO END to its terminal.
#      #625 acceptance item 6 claims order, kinds, waits, conditionality and
#      stopping are read from the table and held nowhere in the executor; this
#      block is what makes that claim checkable rather than asserted. If any of
#      it were positional or hard-coded, a table shaped like this could not run.
#
# THE FIXTURE IS SEAM-FREE AND THAT BOUNDS IT — stated rather than left to be
# discovered. Every state in it is compute/wait/terminal, the three kinds that
# need no renderer; a `write` state would need one bound to its id, every
# shipped renderer composes from a survey, and a survey needs the substrate. So
# block 2 exercises order, waits, conditionality, resumption and stopping, and
# exercises NO owner-artifact writing. Block 1 is what covers that, which is
# why the two are not interchangeable and why neither is dropped.
#
# THE SHIPPED-TABLE BLOCK RUNS AGAINST A STUB GATEWAY, never the real seam: the
# property is a COUNT over a table and a record, and a check that reached a live
# substrate would make its own result depend on material nobody pinned. Where
# the stub cannot be reached the block reports CANNOT-DETERMINE and FAILS,
# because the stub is tree-local — a fixture that cannot run is a defect in this
# check rather than a fact about the world, the same reading
# check-registry-conformance.sh gives a `probe:` that will not execute.
#
# NOT CARRIED HERE: survey/cover/figure/navigation composition, which is
# check-terrain-composition.sh; and the runtime's own fixture pass, which is
# check-terrain-runtime.sh. This member asserts the CONTROL PLANE's counts and
# its table-drivenness, and nothing about the material either one composes.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== terrain §15 control plane, counted against its table (kogaki#654)"
FAIL=0
STUB="checks/fixtures/terrain/compose-input/stub-gateway.mjs"
EVOLVED="checks/fixtures/terrain/workflow/evolved.json"
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

for f in "$STUB" "$EVOLVED"; do
  [[ -f "$f" ]] || { echo "FAIL: CANNOT-DETERMINE — $f is missing, and it is tree-local; a fixture this check cannot reach is a defect in the check, not a finding about the table"; exit 1; }
done

# ---- Block 1: the SHIPPED table.
RD1="$WORK/shipped"; mkdir -p "$RD1"
OUT1=$(STUB_ELEMENT_SURVEY_CONFORMING=1 STUB_GATEWAY_CALL_LOG="$WORK/calls.log" \
  TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
  node terrain/terrain.mjs run --run-dir "$RD1" 2>&1)
if [[ ! -f "$RD1/run-record.json" ]]; then
  echo "FAIL: CANNOT-DETERMINE — the shipped table left no run record, so no count could be read; this is not a pass"
  printf '%s\n' "$OUT1" | tail -5
  FAIL=1
else
  ST1=$(STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
    node terrain/terrain.mjs run --run-dir "$RD1" --status 2>&1)
  if grep -q "DISAGREES with counted_baseline" <<<"$ST1"; then
    echo "FAIL: the shipped table's counted_baseline disagrees with the baseline derived from its own states array — a denominator asserting a shape the table no longer has:"
    grep "DISAGREES" <<<"$ST1" | sed 's/^/    /'
    FAIL=1
  else
    echo "ok: shipped table — counted_baseline agrees with the baseline derived from its states array (writes included)"
  fi
fi

# ---- Block 2: the EVOLVABILITY fixture, driven end to end.
RD2="$WORK/evolved"; mkdir -p "$RD2"
step() { node terrain/terrain.mjs run --run-dir "$RD2" --workflow "$EVOLVED" "$@" 2>&1; }
E0=$(step)
# The record AT THE FIRST STOP, kept before the next act overwrites it: the
# moved-handoff property is a fact about that moment and is unreadable later.
cp "$RD2/run-record.json" "$WORK/first-record.json" 2>/dev/null || true
E1=$(step --input "what they said"); E2=$(step --input "ratified")

# THE MOVED HANDOFF: the first stop must be the table's FIRST state, which
# means NOTHING RAN BEFORE IT. Asserting only that the run stopped at
# OPENING_QUESTION does NOT test that — it holds equally when a compute sits
# ahead of the wait, which is the shipped table's own shape. Measured at
# authoring: a mutant moving `gather` in front of the wait passed the
# stop-name test and was caught by nothing. So the assertion binds the
# property (nothing preceded the handoff) rather than a proxy for it, and the
# stop-name test stays beside it as the cheaper half.
grep -q "STOPPED at OPENING_QUESTION" <<<"$E0" || {
  echo "FAIL: the executor did not stop at OPENING_QUESTION on its first act"; FAIL=1; }
# THE ADDED ENTRY POINT reached its terminal: reconsider is an id no executor
# line names, so a run completing through it is the evolvability evidence.
grep -q "reached done — terminal" <<<"$E2" || {
  echo "FAIL: the fixture table did not reach its terminal — an added entry point (reconsider) and a moved handoff must run with ZERO executor control-code changes (#625 acceptance item 6)"
  printf '%s\n' "$E2" | tail -4; FAIL=1; }
python3 - "$RD2/run-record.json" "$WORK/first-record.json" <<'PY' || FAIL=1
import json, sys
rec = json.load(open(sys.argv[1]))
first = json.load(open(FIRST_REC)) if (FIRST_REC := sys.argv[2]) else None
if first is not None and first.get("completed"):
    print(f"FAIL: the fixture's first act completed {first['completed']} before reaching its wait — "
          f"the table declares the wait FIRST, so a run that computed anything ahead of it read "
          f"position rather than the table (#625 acceptance item 6)")
    raise SystemExit(1)
missing = [s for s in ("gather", "reconsider") if s not in rec["completed"]]
if missing:
    print(f"FAIL: the fixture's own states {missing} are absent from the run record's completed list — "
          f"the executor did not actually traverse the added entry point")
    raise SystemExit(1)
if "second_thoughts" not in rec.get("conditional_skipped", []):
    print("FAIL: the fixture's conditional wait was neither entered nor recorded as skipped — "
          "conditionality is read from the table, and a record silent on it cannot be resumed from")
    raise SystemExit(1)
PY

ST2=$(step --status)
if grep -q "DISAGREES with counted_baseline" <<<"$ST2"; then
  echo "FAIL: the fixture table's own counted_baseline disagrees with its derived baseline — the check counts each table AGAINST ITSELF, which is the property acceptance item 6 asks for:"
  grep "DISAGREES" <<<"$ST2" | sed 's/^/    /'
  FAIL=1
else
  echo "ok: evolvability fixture — a moved handoff and an added entry point ran to terminal with zero executor control-code changes, and the table's counted_baseline agrees with its own states"
fi

cat <<'EOF'
reach of this check, stated rather than implied: it asserts the §15 control
plane's COUNTS and its table-drivenness. The evolvability fixture is seam-free
by construction and exercises NO owner-artifact writing — block 1, against the
shipped table, is what covers that count. Composition of the material either
table drives is check-terrain-composition.sh, and the runtime's own fixture
pass is check-terrain-runtime.sh; neither is re-asserted here.
EOF
exit $FAIL
