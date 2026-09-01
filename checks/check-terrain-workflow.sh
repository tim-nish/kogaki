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
GATED="checks/fixtures/terrain/workflow/gated.json"
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

# THE OWNER'S TREE IS NEVER WRITTEN (PR #664 round 1). The shipped table's
# second state is a `write` rendering to `reports/Screen.md`, which
# `renderingsDir` resolves under the repository root — so without this every
# suite run would leave STUB material standing as the owner's screen, and would
# run `retireIdentityNamedRenderings` over the owner's directory. `reports/` is
# gitignored, so nothing would go red: the loss would be silent and local,
# which is why it is prevented rather than detected. The sibling member states
# the same position in its own words (check-terrain-composition.sh:50-58).
KOGAKI_REPORTS_DIR="$WORK/renderings"; mkdir -p "$KOGAKI_REPORTS_DIR"
export KOGAKI_REPORTS_DIR

for f in "$STUB" "$EVOLVED" "$GATED" "checks/lib/assert-gate-capture.py"; do
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
  # AN OMITTED KEY IS A DISABLED COMPARISON, NOT A PASS (PR #664 round 1).
  # `reportRunStatus` emits DISAGREES only for keys the table DECLARES, and
  # renders `(not in counted_baseline)` for the rest — so deleting a key from
  # `counted_baseline` silently removes it from the judgment, which is the
  # denominator-asserting-a-shape class this member exists to catch, reached by
  # omission instead of by drift. The declared set is asserted before the
  # disagreement is read.
  #
  # THE REQUIRED SET IS DERIVED FROM THE RUNTIME (kogaki#625, from PR #664
  # round 2). It was a four-name list written here while `derivedBaseline`
  # computed five, so deleting `grammared_writing_states` disabled that key's
  # comparison and passed — the very route this assertion exists to close,
  # surviving inside it for a fifth of the denominator. A longer list would
  # repair the instance and keep the shape; reading the set from the runtime
  # removes the list.
  python3 checks/lib/assert-baseline-keys.py specs/spec-terrain/workflow.json "the shipped table" || FAIL=1
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
try:
    first = json.load(open(sys.argv[2]))
except OSError:
    # The record at the first stop is the ONLY place the moved-handoff property
    # is readable; a run that left none has not demonstrated it, and saying so
    # by name beats a traceback that names a path (PR #664 round 1).
    print("FAIL: no run record was kept from the fixture's first act, so the "
          "moved-handoff property could not be read — this is not a pass")
    raise SystemExit(1)
if first.get("completed"):
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

# BLOCK 2 HAD NO OMISSION ASSERTION AT ALL, so the same hole was open on the
# fixture table whose baseline this check otherwise insists on counting against
# itself (PR #664 round 2). One derived assertion, applied to every table this
# member drives.
python3 checks/lib/assert-baseline-keys.py "$EVOLVED" "the evolvability fixture" || FAIL=1
python3 checks/lib/assert-baseline-keys.py "$GATED" "the gate fixture" || FAIL=1

ST2=$(step --status)
if grep -q "DISAGREES with counted_baseline" <<<"$ST2"; then
  echo "FAIL: the fixture table's own counted_baseline disagrees with its derived baseline — the check counts each table AGAINST ITSELF, which is the property acceptance item 6 asks for:"
  grep "DISAGREES" <<<"$ST2" | sed 's/^/    /'
  FAIL=1
else
  echo "ok: evolvability fixture — a moved handoff and an added entry point ran to terminal with zero executor control-code changes, and the table's counted_baseline agrees with its own states"
fi

# ---- Block 3: THE GATE PATH (kogaki#625 item 1, PR #671 round 1).
#
# The `--input` refusal at a gate wait, the capture's option validation, the
# tool_use_id evidence and the owed-and-unwritten refusal all shipped asserted
# by nothing — which is the class this repository keeps finding, and keeps
# finding in its own diffs. This block drives them, seam-free, over TWO tables
# differing in exactly one property: `gated.json`'s wait has an option composer
# bound to it (by state id, which is how a fixture table reaches one at all) and
# `evolved.json`'s does not.
#
# The PAIR is the assertion. One table alone could not distinguish "the executor
# writes declarations" from "the executor writes a declaration for every gate
# state", and the second is what acceptance item 6 forbids.
RD3="$WORK/gated"; mkdir -p "$RD3"
g() { node terrain/terrain.mjs run --run-dir "$RD3" --workflow "$GATED" "$@" 2>&1; }

STOP=$(g --ids a,b)
DECL=$(sed -n 's|.*Its run declaration is WRITTEN: ||p' <<<"$STOP")
if [[ -z "$DECL" || ! -f "$DECL" ]]; then
  echo "FAIL: the executor stopped at a composable gate wait and named no written declaration — SKILL.md tells the session to render a file, so the runtime must point at it:"
  sed 's|^|    |' <<<"$STOP"
  FAIL=1
else
  IN=$(g --input "strand:a")
  if ! grep -q "answered by a CAPTURE" <<<"$IN"; then
    echo "FAIL: a bare --input ANSWERED a gate wait whose declaration was written — removing the capture command closed the out-of-band route and this is the in-band one beside it:"
    sed 's|^|    |' <<<"$IN" | head -3
    FAIL=1
  fi
  BOGUS=$(g --capture-option "not-offered" --tool-use-id tu_x)
  if ! grep -q "was not offered by the declaration" <<<"$BOGUS"; then
    echo "FAIL: a capture naming an option the declaration never offered was ACCEPTED: $(head -1 <<<"$BOGUS")"; FAIL=1
  fi
  NOEV=$(g --capture-option "strand:a")
  if ! grep -q "tool-use-id" <<<"$NOEV"; then
    echo "FAIL: a capture with no --tool-use-id was ACCEPTED — the evidence is what separates a rendering that happened from a claim that one did: $(head -1 <<<"$NOEV")"; FAIL=1
  fi
  OK=$(g --capture-option "strand:a" --tool-use-id tu_1)
  if ! grep -q "reached done" <<<"$OK"; then
    echo "FAIL: a valid capture did not carry the run to its terminal:"; sed 's|^|    |' <<<"$OK" | head -3; FAIL=1
  fi
  python3 checks/lib/assert-gate-capture.py "$RD3" || FAIL=1
fi

# THE PATH BRANCH, REACHED RATHER THAN REASONED ABOUT (PR #671 round 2).
# Every run dir above is under `mktemp -d`, where `relFromRepo` returns the path
# ABSOLUTE AND UNTOUCHED — so none of them exercises the repo-relative branch of
# the record/read pair at all, and a fix to that branch reads correct against a
# suite that never runs it. That is how the same crash arrived twice from
# opposite sides: `join(REPO, ...)` broke the absolute case, and the bare read
# that fixed it broke the relative one.
#
# So this case puts the run dir INSIDE the repository and drives it from a
# SUBDIRECTORY, which is the only combination where the two conventions can
# disagree: the declaration is recorded root-relative and, under a bare read,
# would be resolved against a CWD that is not the root.
# ONE TRAP, BOTH DIRECTORIES (PR #672 round 1). Bash keeps ONE handler per
# signal, so a second `trap ... EXIT` REPLACES the first rather than joining it
# — this line silently disarmed the cleanup at :59 and leaked $WORK, holding all
# four run workspaces, on every run of this member. The PR that added it asked in
# its own Review Focus whether the NEW directory could leave residue; it could
# not, and the pre-existing one then always did.
RD5="$(mktemp -d "$PWD/.gate-path-check-XXXXXX")"; trap 'rm -rf "$WORK" "$RD5"' EXIT
REL5="${RD5#"$PWD"/}"
( cd checks && node ../terrain/terrain.mjs run --run-dir "../$REL5" --workflow "../$GATED" --ids a,b ) >/dev/null 2>&1
CAP5=$( cd checks && node ../terrain/terrain.mjs run --run-dir "../$REL5" --workflow "../$GATED" --capture-option "strand:a" --tool-use-id tu_5 2>&1 )
if grep -q "ERR_INVALID_ARG_TYPE\|ENOENT\|no such file" <<<"$CAP5"; then
  echo "FAIL: a capture with an IN-REPO run dir, driven from a subdirectory, died resolving its own declaration — the declaration is recorded repo-root-relative and must be read the same way, or the write and the read are two conventions that agree only where the path happens to be absolute:"
  sed 's|^|    |' <<<"$CAP5" | head -3
  FAIL=1
elif ! grep -q "Captured" <<<"$CAP5"; then
  echo "FAIL: a capture with an IN-REPO run dir did not record its row: $(head -1 <<<"$CAP5")"; FAIL=1
else
  echo "ok: the gate declaration is recorded and read through ONE convention — an in-repo run dir driven from a subdirectory captures, which is the branch every mktemp-based case above leaves untouched"
fi

# The OTHER half of the pair: a gate state with NO bound composer. Its
# declaration is owed-and-unwritten by design — refusing it outright would make
# adding a gate state to a table need driver code, which item 6 denies — so a
# capture must REFUSE naming that state while a bare --input stays admissible.
# Without this the carve-out is a comment.
RD4="$WORK/unwritten"; mkdir -p "$RD4"
e() { node terrain/terrain.mjs run --run-dir "$RD4" --workflow "$EVOLVED" "$@" 2>&1; }
e >/dev/null 2>&1 || true
e --input "opening" >/dev/null 2>&1 || true
e >/dev/null 2>&1 || true
UNW=$(e --capture-option "anything" --tool-use-id tu_2)
if ! grep -q "never written" <<<"$UNW"; then
  echo "FAIL: a capture at a composer-less gate state did not refuse BY NAME — it is reachable on the very fixture the design cites as its proof, and a raw TypeError there is the shape every neighbouring branch is careful to avoid:"
  sed 's|^|    |' <<<"$UNW" | head -3
  FAIL=1
else
  echo "ok: a gate state with no bound option composer records its declaration owed-and-unwritten, refuses a capture by name, and still runs — which is what keeps acceptance item 6 true"
fi

# ---- Block 5: THE NEIGHBORHOOD JUDGMENT POINT, driven through the executor
# (kogaki#690, owner ruling 2026-08-29).
#
# WHY IT IS HERE AND NOT IN THE COMPOSITION MEMBER. That member drives `report`
# DIRECTLY with a fixture, which is exactly the reachability #690 was filed
# about — a judged path reachable only by direct invocation is the state the
# ruling ends. The property under test is that the EXECUTOR reaches it, so the
# test has to be a run.
#
# SIX ARMS. The first was the ruling's answer to "what is an unjudged pull" —
# a skip that completed — and kogaki#741 inverted it: the states are
# unconditional, so an unjudged run REFUSES. Arms 3b and 3c are that ruling's
# other two acceptance items, the record join observed through a deleted file
# and the widened identity observed as two reports where the triple wrote one.
#
# THE RUN DIRS ARE NAMED `RDJ*`, NOT `RD5`. The gate-path block above already
# holds `RD5`, and its EXIT trap removes `"$RD5"` — a second block reusing the
# name makes the trap delete the wrong directory and leave the in-repo
# `.gate-path-check-*` one standing forever, which turns check-gate-carrier.sh
# red on a NEXT run over leftovers this member created. Found by running the
# suite after this block landed, not by reading it.
RDJ="$WORK/judgment"; mkdir -p "$RDJ"
J() { STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
      node terrain/terrain.mjs run --run-dir "$RDJ" "$@" 2>&1; }
J >/dev/null 2>&1 || true
JSURVEY=$(ls "$RDJ"/*.terrain-survey.json 2>/dev/null | head -1)
if [[ -z "$JSURVEY" ]]; then
  echo "FAIL: CANNOT-DETERMINE — the judgment-point block left no survey record, so nothing below could be driven; this is not a pass"
  FAIL=1
else
  python3 checks/lib/compose-judgment-claims.py "$JSURVEY" "$WORK/j-claims.json"
  printf '%s\n' '{"testing × (no second served tag)":{"judged":true,"subgroups":[]}}' > "$WORK/j-subs.json"
  printf '%s\n' '{"foxtrot":{"level":"core","claim":"a journey-family neighbour reached through the same Batch"}}' > "$WORK/j-good.json"
  printf '%s\n' '{"zzz-no-such-candidate":{"level":"core","claim":"orphan"}}' > "$WORK/j-orphan.json"
  COMMON=(--claims "$WORK/j-claims.json" --subdivisions "$WORK/j-subs.json" --judge-model claude-opus-5 --judge-effort high)
  J --input testing "${COMMON[@]}" >/dev/null 2>&1 || true

  # ARM 1 — UNJUDGED, AND IT NOW REFUSES (§13.4, kogaki#741 ruling 1/2).
  # Both states are UNCONDITIONAL, so a run naming no judgment does not skip
  # them: it enters J3, which has no record to validate, and never reaches a
  # Full Report. This arm asserted the opposite until kogaki#754 — that the two
  # states were skipped and `full_report` completed anyway — which is the design
  # #741 superseded, so the assertion is inverted rather than deleted.
  RDJ_UNJUDGED="$WORK/judgment-unjudged"; cp -r "$RDJ" "$RDJ_UNJUDGED"
  STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
    node terrain/terrain.mjs run --run-dir "$RDJ_UNJUDGED" --input G1 "${COMMON[@]}" >/dev/null 2>&1 || true
  if ! python3 checks/lib/assert-judgment-refusal.py "$RDJ_UNJUDGED/run-record.json"; then
    echo "FAIL: an unjudged run reached a Full Report, or still records the neighborhood states as skipped conditionals — §13.4 makes both states unconditional and the Report REQUIRE the judgment pass, so there is no path to an unjudged neighborhood rendering"
    FAIL=1
  else
    echo "ok: unjudged run — no Full Report written and neither neighborhood state recorded as skipped (§13.4's refusal, kogaki#741)"
  fi

  # ARM 2 — AN ORPHAN JUDGMENT KEY IS REFUSED BY NAME. The refusal needs the
  # emitter's enumeration, which is why the emitter is its own state: a key
  # naming no mechanical candidate is only detectable against it.
  RDJ_ORPHAN="$WORK/judgment-orphan"; cp -r "$RDJ" "$RDJ_ORPHAN"
  ORPH=$(STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
    node terrain/terrain.mjs run --run-dir "$RDJ_ORPHAN" --input G1 "${COMMON[@]}" \
    --enter neighborhood_input --enter J3_neighborhood --neighborhood "$WORK/j-orphan.json" 2>&1)
  if ! grep -q "zzz-no-such-candidate" <<<"$ORPH"; then
    echo "FAIL: J3_neighborhood did not refuse an orphan judgment key BY NAME — a judgment that joins nothing is silently dropped and the section then reports that the judgment layer did not run, which is false:"
    sed 's|^|    |' <<<"$ORPH" | tail -3
    FAIL=1
  else
    echo "ok: an orphan judgment key is refused by name, against the enumeration neighborhood_input wrote"
  fi

  # ARM 3 — A JUDGED RUN RENDERS ROWS THROUGH THE EXECUTOR. This is the whole
  # of #690: before it, the judged path was reachable only by invoking `report`
  # directly with a fixture.
  #
  # `--report-dir` IS FRESH, AND THAT IS NOT TEST HYGIENE. §12.1's identity is
  # (pin, query, judge, judgment record) since kogaki#741 — it was the triple
  # (pin, query, judge) when this comment was written, and the composed CLAIMS
  # and SUBDIVISIONS are still recorded rather than keyed, so a pull differing
  # from a stored report only in those REFUSES with the kogaki#700 mismatch
  # rather than replaying. Without a fresh record dir this arm would refuse or
  # pass on which order the arms happened to run in, which is the
  # assertion-that-cannot-fail shape wearing a different outcome.
  # The refusal itself is asserted where it belongs, in
  # check-terrain-composition.sh's §12.1 block; this arm asserts the judged
  # rendering and takes a fresh dir so that it can.
  RDJ_JUDGED="$WORK/judgment-judged"; cp -r "$RDJ" "$RDJ_JUDGED"
  STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
    node terrain/terrain.mjs run --run-dir "$RDJ_JUDGED" --input G1 "${COMMON[@]}" \
    --enter neighborhood_input --enter J3_neighborhood --neighborhood "$WORK/j-good.json" \
    --report-dir "$WORK/j-records" >/dev/null 2>&1 || true
  JREND="$KOGAKI_REPORTS_DIR/FullReport.md"
  if [[ ! -f "$JREND" ]]; then
    echo "FAIL: CANNOT-DETERMINE — the judged run wrote no Full Report rendering, so no row could be read; this is not a pass"
    FAIL=1
  elif grep -q "the judgment layer did not" "$JREND"; then
    echo "FAIL: a JUDGED run through the executor still rendered the all-unjudged line — the judgment point is declared and its record reaches nothing, which is the reader-with-no-writer state kogaki#690 exists to end:"
    sed -n '/Provenance neighborhood/,+4p' "$JREND" | sed 's|^|    |'
    FAIL=1
  elif ! grep -q "\[core\]" "$JREND"; then
    echo "FAIL: a judged run rendered no row carrying its level — the judgments validated at J3 and did not reach the rendering"
    FAIL=1
  else
    echo "ok: a judged run through the EXECUTOR renders its row and level — the judged path is reachable by \`run\`, not only by invoking \`report\` with a fixture"
  fi
  # ARM 3b — THE JUDGMENT IS JOINED FROM THE RUN RECORD, AND A RECORD WHOSE
  # FILE IS GONE REFUSES BY NAME (§13.4, kogaki#741 acceptance 2). Two halves,
  # and neither carries the property alone: the run record must NAME the
  # judgment file (the join is from the record, not from the render's argv), and
  # rendering from that named path once the file is gone must refuse rather than
  # render an unjudged section.
  #
  # THE SECOND HALF IS DRIVEN AT `report`, AND THE SCOPE IS STATED. The executor
  # parks at the next gate wait once the run is complete, and answering a gate
  # to re-render is a capture this arm has no business minting — so the render
  # is invoked directly with THE PATH READ OUT OF THE RUN RECORD, which is the
  # value `run` itself hands the renderer. What is NOT asserted here: that the
  # executor passes that value rather than its own argv. That half is the first
  # one, above, plus ARM 3's judged render, and it is named rather than implied.
  RDJ_GONE="$WORK/judgment-gone"; cp -r "$RDJ" "$RDJ_GONE"
  cp "$WORK/j-good.json" "$WORK/j-gone.json"
  STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
    node terrain/terrain.mjs run --run-dir "$RDJ_GONE" --input G1 "${COMMON[@]}" \
    --enter neighborhood_input --enter J3_neighborhood --neighborhood "$WORK/j-gone.json" \
    --report-dir "$WORK/j-gone-records" >/dev/null 2>&1 || true
  NAMED=$(python3 -c 'import json,sys; print((json.load(open(sys.argv[1])).get("judgments") or {}).get("J3_neighborhood",""))' "$RDJ_GONE/run-record.json")
  if [[ -z "$NAMED" ]]; then
    echo "FAIL: the run record names no J3_neighborhood judgment file — the join has nothing to be from, and a render would fall back to whatever its own argv carried"
    FAIL=1
  else
    rm -f "$WORK/j-gone.json"
    GONE=$(STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
      node terrain/terrain.mjs report --survey "$JSURVEY" --tag testing --ids G1 \
      "${COMMON[@]}" --neighborhood "$NAMED" \
      --report-dir "$WORK/j-gone-records-2" --rendering-dir "$WORK/j-gone-rend" 2>&1)
    if grep -q "judgment record this pull joins is gone" <<<"$GONE"; then
      echo "ok: the run record NAMES the judgment file, and rendering from that named path once the file is deleted REFUSES by name — §13.4 acceptance 2"
    elif grep -qi "ENOENT" <<<"$GONE"; then
      echo "FAIL: the deleted judgment record surfaced as an uncaught ENOENT — loud, but naming neither the state nor the repair; §13.4 acceptance 2 asks for a typed refusal:"
      sed 's|^|    |' <<<"$GONE" | tail -3
      FAIL=1
    else
      echo "FAIL: rendering from a judgment path the run record names, with the file deleted, did not refuse — an unjudged section is what §13.4 has no path to:"
      sed 's|^|    |' <<<"$GONE" | tail -3
      FAIL=1
    fi
  fi

  # ARM 3c — TWO JUDGMENT RECORDS OVER ONE (pin, query, judge) ARE TWO REPORTS
  # (§12.1's discriminator row, kogaki#741 ruling 2, acceptance 3). This is the
  # whole reason the identity was widened: under the triple the re-judged pull
  # shared an identity with the first and replayed it, so a rerun after
  # re-judging rendered the OLD levels. Asserted over the machine records, whose
  # filenames carry the identity digest — two files is the widening holding, one
  # file is the replay it removed.
  printf '%s\n' '{"foxtrot":{"level":"useful","claim":"the same neighbour, judged one level down"}}' > "$WORK/j-good2.json"
  RDJ_REJUDGE="$WORK/judgment-rejudge"; cp -r "$RDJ" "$RDJ_REJUDGE"
  for JF in "$WORK/j-good.json" "$WORK/j-good2.json"; do
    RDJ_ONE="$WORK/judgment-rejudge-$(basename "$JF" .json)"; cp -r "$RDJ" "$RDJ_ONE"
    STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
      node terrain/terrain.mjs run --run-dir "$RDJ_ONE" --input G1 "${COMMON[@]}" \
      --enter neighborhood_input --enter J3_neighborhood --neighborhood "$JF" \
      --report-dir "$WORK/j-rejudge-records" >/dev/null 2>&1 || true
  done
  NREC=$(ls "$WORK/j-rejudge-records"/terrain-full-report-*.json 2>/dev/null | wc -l)
  if [[ "$NREC" == 2 ]]; then
    echo "ok: two judgment records over one (pin, query, judge) wrote TWO reports — the judgment record is KEYED, so a re-judged rerun renders rather than replaying"
  else
    echo "FAIL: re-judging the same pull wrote $NREC report record(s), not 2 — under §12.1's quadruple the judgment record is part of the identity, so a re-judged pull is a different report and not a replay of the first"
    FAIL=1
  fi

  # ARM 4 — AN EMPTY ENUMERATION IS NOT AN ERROR. `cmdReport`'s own orphan
  # refusal is scoped to a non-empty candidate set, because "refusing the whole
  # pull there would turn a legitimate empty neighborhood into an error"; J3's
  # was not, so a settled set whose neighborhood yields nothing was rendered
  # honestly by `report` and REFUSED by `run` — the second reading of one rule
  # that J3's own comment sets out to avoid (PR #701 round 1).
  #
  # The settled set is a SubGroup holding only the fixture's solo-batch member,
  # which is the one selection whose neighborhood is empty against this stub.
  #
  # LABELLED `other`, AND THE LABEL IS LOAD-BEARING HERE (kogaki#683, relabelled
  # at kogaki#738). The solo SubGroup holds 1 of the parent's 5 members; the
  # other 4 are PLACED IN A SECOND SubGroup rather than swept, because kogaki#738
  # deletes the sweep and refuses a classification that leaves any member
  # unplaced. The `catch_all_share` bound this comment used to compute against —
  # 4 of 5 is 80%, far over its 30% — is deleted with that sweep and is named
  # here as provenance rather than as a live rule.
  # retired-vocab-ok: provenance, the label now carries it.
  #
  # The screen is renderable because §6.2 v7 rule 3 SUPPRESSES the split... no
  # longer: with TWO named SubGroups the suppression's single-SubGroup condition
  # does not hold, so the group renders its split. That is a change in WHY the
  # screen renders and not in WHAT this arm asserts — the arm is about an empty
  # neighborhood enumeration, and the subdivision is its precondition.
  # Before kogaki#683 the fixture carried no verdicts at all and suppression
  # fired on the absent `tighter_than_parent`; the label now carries the reading
  # explicitly.
  # Without a conformant subdivision the scope fix is unexercised: un-scoping the
  # refusal again fails nothing, which is the assertion-that-cannot-fail shape.
  RDJ_EMPTY="$WORK/judgment-empty"; mkdir -p "$RDJ_EMPTY"
  EJ() { STUB_ELEMENT_SURVEY_CONFORMING=1 TSUREZURE_GATEWAY_JS="$PWD/$STUB" \
         node terrain/terrain.mjs run --run-dir "$RDJ_EMPTY" "$@" 2>&1; }
  EJ >/dev/null 2>&1 || true
  ESURVEY=$(ls "$RDJ_EMPTY"/*.terrain-survey.json 2>/dev/null | head -1)
  python3 checks/lib/compose-judgment-claims.py "$ESURVEY" "$WORK/e-claims.json"
  # EVERY MEMBER PLACED, AND THAT IS kogaki#738 (ruling 1). This fixture placed
  # `lesson:delta` alone and said so in its own reason — "the rest sweep to the
  # remainder" — which is exactly the sweep #738 deletes; the classification now
  # refuses. The solo SubGroup is unchanged (the arm below selects G1-1 and needs
  # it to hold delta alone); the other four ride a second SubGroup, so the cover
  # is complete because the judge placed them rather than because the engine did.
  printf '%s\n' '{"testing × (no second served tag)":{"judged":true,"subgroups":[{"subgroup":"the solo batch","claim":"the solo-batch member alone","members":["lesson:delta"],"coherence":"other","coherence_why":"no 2+ subset among these members holds together at related or better"},{"subgroup":"the rest","claim":"the members that are not the solo-batch one","members":["lesson:alpha","lesson:bravo","lesson:charlie","lesson:echo"],"coherence":"related","coherence_why":"the members share a theme, not one mechanism"}]}}' > "$WORK/e-subs.json"
  printf '%s\n' '{"anything":{"level":"core","claim":"a key judged against an EMPTY enumeration"}}' > "$WORK/e-j.json"
  ECOMMON=(--claims "$WORK/e-claims.json" --subdivisions "$WORK/e-subs.json" --judge-model claude-opus-5 --judge-effort high)
  EJ --input testing "${ECOMMON[@]}" >/dev/null 2>&1 || true
  EOUT=$(EJ --input G1-1 "${ECOMMON[@]}" --enter neighborhood_input --enter J3_neighborhood \
    --neighborhood "$WORK/e-j.json" --report-dir "$WORK/e-records")
  if ! python3 checks/lib/assert-empty-enumeration.py "$RDJ_EMPTY/terrain-neighborhood-candidates.json"; then
    echo "FAIL: CANNOT-DETERMINE — the solo-batch selection did not produce an EMPTY enumeration, so the arm asserts nothing about the empty case; this is not a pass"
    FAIL=1
  elif grep -q "refuses .* judgment key" <<<"$EOUT"; then
    echo "FAIL: J3_neighborhood refused against an EMPTY enumeration — \`report\` renders such a settled set honestly and \`run\` would reject it, which is two readings of one rule:"
    sed 's|^|    |' <<<"$EOUT" | grep "refuses" | head -1
    FAIL=1
  else
    echo "ok: an empty mechanical enumeration is not an error — J3 scopes its orphan refusal exactly as cmdReport scopes its own"
  fi

fi

cat <<'EOF'
reach of this check, stated rather than implied: it asserts the §15 control
plane's COUNTS, its table-drivenness, and its GATE PATH. The evolvability fixture is seam-free
by construction and exercises NO owner-artifact writing — block 1, against the
shipped table, is what covers that count. Composition of the material either
table drives is check-terrain-composition.sh, and the runtime's own fixture
pass is check-terrain-runtime.sh; neither is re-asserted here. Block 3 reaches
an option composer only by naming a state id GATE_WORK already binds, so a
fixture table cannot exercise a composer this runtime does not have — the gate
path is covered for the states that have one, and the owed-and-unwritten case
is what covers the states that do not.
EOF
exit $FAIL
