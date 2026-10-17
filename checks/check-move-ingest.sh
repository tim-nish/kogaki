#!/usr/bin/env bash
# The Move ingestion carrier's fixture pass (kogaki#876).
#
# A THIN INVOKER over `python3 checks/move_ingest_cases.py` (kogaki#1238;
# formerly `tools/move_ingest.py --self-test`), on the
# arrangement check-terrain-runtime.sh and check-draft-runtime.sh already use:
# the cases are functions of the module's own grammar, parser, validator and
# renderer and drive them end to end, so they live with the module. Seam-free
# by construction — every case builds its own text or a temporary directory,
# and the pass reaches no gateway and no network.
#
# WHY THIS MEMBER EXISTS, and the half that is not about kogaki#876 at all:
# `tools/move_ingest.py` carried a full self-test and NO REGISTERED CHECK
# INVOKED IT. The suite runs only what checks/registry.json names (founding
# spec §4), so §6.9.0's four admission conditions, the whole-file-collapse
# refusal, the count instrument, the id-collision atomicity and the §6.9.2
# verdict-token construction constraint were every one of them unenforced —
# a future edit re-broke any of them with no CI signal. That is the same shape
# as the defect check-terrain-runtime.sh was admitted for: an assertion present,
# correct, and observed by nothing.
#
# WHAT THE PASS ASSERTS is not restated here (kogaki#661) — the count is
# `case_floor` in the registry and the pass prints its own. By property: the
# four §6.9.0 conditions with their offending lines named; the parsed-record
# count rendered first and unconditionally; §6.9.1a's round trip and filename
# derivation; INDEX regenerated whole with every column read off a file;
# §6.9.2's verdict token unrenderable on a row; and, from kogaki#876, the
# closed kind set's own two malformations, a formless record left byte-
# identical through the round trip, a conforming form admitted and rendered in
# the KIND's role order, the three refusals a form owes plus the no-kind and
# empty-role cases, condition 3 still refusing a ninth key and a seventh, the
# nesting admitted by NAME rather than by shape, and the shipped axis record
# admitted at its committed bytes.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== move ingestion fixture pass (kogaki#876)"

OUT=$(python3 checks/move_ingest_cases.py 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "move_ingest self-test:" <<<"$OUT"; then
  echo "FAIL: the ingestion fixture pass did not run clean — the cases live with the module and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'move-ingest'))
") || { echo "FAIL: could not read case_floor for move-ingest from checks/registry.json"; exit 1; }
N=$(sed -n 's/^move_ingest self-test: \([0-9][0-9]*\) checks, .*/\1/p' <<<"$OUT")
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
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced in the same act, so the ratchet is $((N - FLOOR)) behind and cannot see a case deleted inside that gap (kogaki#970). Set case_floor to $N for 'move-ingest' in checks/registry.json, in this commit"
  exit 1
fi

# THE ONE ASSERTION THIS MEMBER HOLDS ITSELF, and it is here rather than in the
# pass because its subject is the TREE rather than the module: every record in
# `moves/` is validated against the LIVE closed set. The pass's shipped-record
# case covers the one record kogaki#876 names; this covers record N+1, which is
# exactly the one a later admission act adds and no fixture knows about.
# kogaki#1413: a Move record is a `.yaml` file, so the arm reads every `.yaml`
# record; a `.md` record is the retired form, which the reader refuses by name
# (`record-form`) — asserted here over each one — until kogaki#1415 regenerates
# the committed library. The library is empty only where it holds neither.
LIVE=$(python3 -c "
import os, sys
sys.path.insert(0, 'tools')
import move_ingest as m
bad = []
names = sorted(os.listdir('moves'))
records = [n for n in names if n.endswith(m.MOVE_RECORD_EXT)]
retired = [n for n in names if n.endswith('.md') and n != 'INDEX.md']
for name in records:
    path = os.path.join('moves', name)
    try:
        mapping = m.read_saved(path)
        m.check_field_set(mapping, 1)
        m.check_state_shape(mapping, 1)
        m.check_figure(mapping, 1)
    except Exception as exc:
        bad.append('%s: %s' % (path, exc))
        continue
    if m.render_move(mapping) != open(path).read():
        bad.append('%s: does not round-trip through the renderer' % path)
for name in retired:
    path = os.path.join('moves', name)
    try:
        m.read_saved(path)
        bad.append('%s: a retired .md record was read' % path)
    except m.Refusal as exc:
        if exc.condition != 'record-form':
            bad.append('%s: refused on %s, not record-form' % (path, exc.condition))
for line in bad:
    print(line)
print('COUNTED %d %d' % (len(records), len(retired)))
" 2>&1) || { echo "FAIL: the live read over moves/ could not run"; printf '%s\n' "$LIVE"; exit 1; }
printf '%s\n' "$LIVE" | grep -v '^COUNTED ' || true
if grep -qv '^COUNTED ' <<<"$LIVE"; then
  echo "FAIL: a record in moves/ does not satisfy §6.9.0 condition 3 or §6.9.3 against the live kind set, or a retired .md record was not refused by name"
  exit 1
fi
COUNT=$(sed -n 's/^COUNTED \([0-9][0-9]*\) [0-9][0-9]*$/\1/p' <<<"$LIVE")
RETIRED=$(sed -n 's/^COUNTED [0-9][0-9]* \([0-9][0-9]*\)$/\1/p' <<<"$LIVE")
# THE EMPTY-SET REFUSAL IS RESTORED (kogaki#1187). It was suspended by
# kogaki#1175 only until moves/ was repopulated by the Corpus-to-Moves
# conversion; that conversion has now run (kogaki#1187) and moves/ carries
# the 21 Corpus-derived records, so a library holding no record in either
# form is once again a FAIL rather than a deliberately-tolerated empty state.
if [[ -z "$COUNT" || -z "$RETIRED" ]]; then
  echo "FAIL: the live read over moves/ produced no count line — the arm did not run"
  exit 1
fi
if (( COUNT + RETIRED < 1 )); then
  echo "FAIL: moves/ is empty — the live-record arm has nothing to validate (kogaki#1175's empty-set tolerance ended at kogaki#1187, which repopulated moves/)"
  exit 1
fi
echo "ok: moves/ holds $COUNT .yaml record(s), each admitted and round-tripping, and $RETIRED retired .md record(s), each refused by name until kogaki#1415 regenerates them"

# --------------------------------------------------------------------------
# `segments` (kogaki#1320) — the Passage-to-Move path copies the Extraction's
# ordered Segments into the record itself, and refuses where there is none.
# Each case runs the act — `run_passage` itself, against a stubbed model —
# never a grep over the contract or spec wording (admission consult,
# kogaki#1320: "a contract tested against its own text is green about the
# document").
# --------------------------------------------------------------------------
SEGMENTS_OUT=$(python3 <<'PY'
import os
import sys
import tempfile

sys.path.insert(0, "tools")
import move_ingest as m

MOVE_RECORD = """id: test_move_segments
before:
  knowledge: holds nothing about the technique.
after:
  knowledge: holds the technique.
technique: >-
  demonstrates a simple reusable technique.
breaks:
- drop the setup -- the payoff lands for no reason.
- swap the two halves -- the setup no longer earns the payoff.
"""

def fake_spawn(command, model, prompt, timeout_s, cwd=None):
    return MOVE_RECORD

m.spawn_model = fake_spawn

failures = []

def extraction(directory, segments):
    """An Extraction record (kogaki#1413), written by the module's own YAML
    writer, carrying `segments` and the fields around it."""
    path = os.path.join(directory, "extracted.yaml")
    with open(path, "w") as fh:
        fh.write(m.yaml_write({"passage": "A Passage.", "segments": segments,
                               "presupposes": "nothing beyond ordinary attention."}))
    return path

def run(passage, tmp):
    return m.run_passage(passage, "specs/move-extraction-contract.md",
                         os.path.join(tmp, "moves"), "stub", "stub-model",
                         os.path.join(tmp, "out"), 60, select="accept")

# Case 1 — no Extraction at all: refused, naming `segments`.
tmp1 = tempfile.mkdtemp()
passage1 = os.path.join(tmp1, "bare.md")
with open(passage1, "w") as fh:
    fh.write("A bare Passage with no Extraction at all.\n")
try:
    run(passage1, tmp1)
    failures.append(
        "a record with no Extraction `segments` was accepted; it must be "
        "refused naming `segments`")
except m.Refusal as refusal:
    if "segments" not in str(refusal):
        failures.append(
            "the no-Extraction refusal does not name `segments` -- got: %s"
            % refusal)

# Case 2 — an Extraction whose Segments each carry their content clause,
# their `does` and, after the first, their `relation` (kogaki#1414): the
# saved Move carries `segments` as a list of maps of the two prose fields,
# none of the content clauses (kogaki#1367), and Segment 1's recorded
# relation -- a fact about the source -- is not copied (kogaki#1411).
tmp2 = tempfile.mkdtemp()
passage2 = extraction(tmp2, [
    {"opening": "Opening words one",
     "content": "gives the reader an unanswered question about the book's own subject.",
     "does": "states a question the reader did not hold.",
     "relation": "takes up the source's earlier chapter."},
    {"opening": "Opening words two",
     "content": "answers the book's own question directly.",
     "does": "answers it directly.",
     "relation": "answers the question the step before raised."},
])
try:
    run(passage2, tmp2)
except m.Refusal as refusal:
    failures.append(
        "a record with an Extraction `segments` was refused -- %s" % refusal)
else:
    saved = os.path.join(tmp2, "moves", "test_move_segments.yaml")
    if not os.path.isfile(saved):
        failures.append("no Move was saved at %s" % saved)
    else:
        text = open(saved).read()
        back = m.yaml_read(saved)
        expected = [{"does": "states a question the reader did not hold."},
                    {"does": "answers it directly.",
                     "relation": "answers the question the step before raised."}]
        if back.get("segments") != expected:
            failures.append(
                "`segments` was not saved as a list of each Segment's does "
                "and relation in the Extraction's order -- saved file:\n%s" % text)
        if "book's own subject" in text or "book's own question" in text:
            failures.append(
                "`segments` carried a content clause -- saved file:\n%s" % text)
        if "earlier chapter" in text:
            failures.append(
                "`segments` carried Segment 1's relation, a fact about the "
                "source -- saved file:\n%s" % text)

# Case 3 — a Segment with only the content clause (no `does`) is refused
# naming its Segment number (kogaki#1367, kogaki#1414).
tmp3 = tempfile.mkdtemp()
passage3 = extraction(tmp3, [
    {"opening": "Opening words one", "content": "gives the reader an unanswered question."},
    {"opening": "Opening words two", "content": "answers it directly.",
     "does": "answers it directly.", "relation": "answers the question before it."},
])
try:
    run(passage3, tmp3)
    failures.append(
        "a Segment carrying no `does` was accepted; it must be refused "
        "naming the Segment's number")
except m.Refusal as refusal:
    if "Segment 1" not in str(refusal) or "`does`" not in str(refusal):
        failures.append(
            "the no-`does` refusal does not name Segment 1 and the field "
            "-- got: %s" % refusal)

# Case 3b — a Segment after the first with no `relation` is refused naming
# its number (kogaki#1414).
tmp3b = tempfile.mkdtemp()
passage3b = extraction(tmp3b, [
    {"opening": "Opening words one", "content": "gives the reader a question.", "does": "states a question."},
    {"opening": "Opening words two", "content": "answers it directly.", "does": "answers it directly."},
])
try:
    run(passage3b, tmp3b)
    failures.append(
        "Segment 2 with no `relation` was accepted; it must be refused "
        "naming the Segment's number")
except m.Refusal as refusal:
    if "Segment 2" not in str(refusal) or "`relation`" not in str(refusal):
        failures.append(
            "the no-`relation` refusal does not name Segment 2 and the "
            "field -- got: %s" % refusal)

# Case 4 — a supplied `segments` value disagreeing with the copy is refused
# as today.
tmp4 = tempfile.mkdtemp()
passage4 = extraction(tmp4, [
    {"opening": "Opening words one", "content": "gives the reader an unanswered question.",
     "does": "states a question the reader did not hold."},
])
disagreeing_record = MOVE_RECORD + "segments:\n- does: a disagreeing clause.\n"

def fake_spawn_disagreeing(command, model, prompt, timeout_s, cwd=None):
    return disagreeing_record

m.spawn_model = fake_spawn_disagreeing
try:
    run(passage4, tmp4)
    failures.append(
        "a record supplying a `segments` value disagreeing with the "
        "copy was accepted")
except m.Refusal as refusal:
    if "disagrees with the copy" not in str(refusal):
        failures.append(
            "the disagreeing-segments refusal does not name the "
            "disagreement -- got: %s" % refusal)
finally:
    m.spawn_model = fake_spawn

# Case 5 — no closed label set survives in the contract, the Extractor, the
# ingest or ParagraphPlan (kogaki#1414). Each retired set is matched by a
# member no prose here needs, so the format's own history sentence, which
# names the sets without listing them, passes.
RETIRED = ("settles", "elaboration", "enumeration", "reorder:", "extend:")
for path in ("passages/FORMAT.md", "src/proof-sheet/extract.mjs",
             "src/proof-sheet/extraction-workflow.json", "tools/move_ingest.py",
             "src/paragraph-plan.mjs", "src/paragraph-plan-workflow.json"):
    body = open(path).read()
    for token in RETIRED:
        if token in body:
            failures.append("%s still carries the retired label `%s`" % (path, token))

if failures:
    for f in failures:
        print("FAIL: %s" % f)
    sys.exit(1)
print(
    "ok: segments refused with no Extraction, naming the field; saved as each "
    "Segment's does and relation as a list of maps, never the content clause "
    "or Segment 1's relation; Extractions read as YAML records; refused naming the Segment's number with no `does`, or with no "
    "`relation` after the first; refused where a supplied `segments` disagrees "
    "with the copy; no retired label set in the format, the Extractor, the "
    "ingest or ParagraphPlan (kogaki#1320, kogaki#1367, kogaki#1414, kogaki#1413)")
PY
); SEGRC=$?
printf '%s\n' "$SEGMENTS_OUT"
if [[ $SEGRC -ne 0 ]]; then
  exit 1
fi

# --------------------------------------------------------------------------
# `--from-extraction` (kogaki#1358, design on kogaki#1329; one library,
# kogaki#1366). The fixture is built here in the shape of
# corpus/p1329/m2/..._cascades/p01, because corpus/ is ignored and CI never
# sees it; it is a YAML record (kogaki#1413), written by the module's own
# YAML writer. Cases, each driving the act:
#   1. the derived record's id, before, after, technique, breaks and segments
#      are the Extraction's `name`, `reader` (changed rows only, as maps
#      keyed by dimension), `technique`, `breaks` and `segments`
#      (kogaki#1377 added technique and breaks);
#   2. a paragraph Extraction carrying `contains` is refused naming the field;
#   2b. an Extraction missing `technique` is refused naming the field
#      (kogaki#1377);
#   2c. a `breaks` that is not a list of prose tests is refused naming the
#      field (kogaki#1414);
#   3. `--select accept` lands the Move as `moves/<id>.yaml` in the one
#      library and regenerates `moves/INDEX.md`; a Markdown Extraction is
#      refused by name;
#   3b. THE SHARED EXAMPLE (kogaki#1413): the Move the ingest wrote is read
#      by `moveContract` in src/compose.mjs -- the writer and the reader
#      tested against one file -- its states rendered one
#      `dimension: sentence` line per dimension.
# --------------------------------------------------------------------------
FROM_EXTRACTION_OUT=$(python3 <<'PY'
import copy, io, json, os, shutil, subprocess, sys, tempfile, contextlib
sys.path.insert(0, "tools")
import move_ingest as m

REPO = os.getcwd()
EXTRACTION = {
    "status": "worked example (m2), written from the owner's notes",
    "name": "define_a_named_variable_with_almost_no_new_words",
    "source": "not given",
    "unit": "paragraph 1 of 11 in define_attack_defense_advantage_through_opposed_security_cascades",
    "length": "2 sentences, 1 paragraph",
    "passage": "A term is defined. Each of its states is defined as follows.",
    "reader": {
        "knowledge": {"before": "the first factor is named and not yet defined",
                      "after": "the first factor is defined", "segment": "1"},
        "question": {"before": "what is the first factor?",
                     "after": "\"what do its two states look like?\" opened", "segment": "2"},
        "expectation": {"before": "the factors will be explained one at a time",
                        "after": "unchanged", "segment": ""},
        "orientation": {"before": "a book explaining politics through named factors",
                        "after": "unchanged", "segment": ""},
        "trust": {"before": "neutral", "after": "unchanged", "segment": ""},
    },
    "dimensions_changed": 2,
    "segments": [
        {"opening": "A term is defined",
         "content": "takes up item one of the preceding list and defines it.",
         "does": "takes up the first of a previously presented list of items and defines it.",
         "relation": "takes up the list the previous paragraph closed on."},
        {"opening": "Each of its states",
         "content": "tells the reader two items are coming.",
         "does": "announces that a fixed number of items follow.",
         "relation": "opens the defined item into its parts."},
    ],
    "breaks": [
        "drop the second sentence — the reader never learns the states exist.",
        "name the states before the factor — the reader has no term to hang them on.",
        "add a third state — the completeness claim breaks.",
    ],
    "technique": "Name the item once, then promise its full set of states before giving any one of them.",
    "notes": "none",
}

failures = []

def derived(record):
    return m.derive_from_extraction(copy.deepcopy(record))

p = derived(EXTRACTION)
want = {
    "id": "define_a_named_variable_with_almost_no_new_words",
    "before": {"knowledge": "the first factor is named and not yet defined",
               "question": "what is the first factor?"},
    "after": {"knowledge": "the first factor is defined",
              "question": "\"what do its two states look like?\" opened"},
    "segments": [
        {"does": "takes up the first of a previously presented list of items and defines it."},
        {"does": "announces that a fixed number of items follow.",
         "relation": "opens the defined item into its parts."},
    ],
    "technique": "Name the item once, then promise its full set of states before giving any one of them.",
    "breaks": EXTRACTION["breaks"],
}
if not p.admitted:
    failures.append("case 1: the p01-shaped Extraction was refused: %s" % p.refusal)
elif p.mapping != want:
    failures.append("case 1: derived %r, want %r" % (p.mapping, want))

with_contains = dict(EXTRACTION, contains=["a_slug", "b_slug"])
p = derived(with_contains)
if p.admitted or "`contains`" not in str(p.refusal):
    failures.append("case 2: a paragraph Extraction carrying `contains` was not "
                    "refused naming the field -- got %r" % p.refusal)

# case 2b (kogaki#1377): an Extraction missing `technique` is refused naming
# the field, and nothing is proposed.
no_technique = {k: v for k, v in EXTRACTION.items() if k != "technique"}
p = derived(no_technique)
if p.admitted or "`technique`" not in str(p.refusal):
    failures.append("case 2b: an Extraction with no `technique` was not refused "
                    "naming the field -- got %r" % p.refusal)

# case 2c (kogaki#1414): `breaks` is a list of prose tests; keyed tests are
# refused naming the field, and nothing is proposed.
keyed_breaks = dict(EXTRACTION, breaks={"drop": "the second sentence"})
p = derived(keyed_breaks)
if p.admitted or "`breaks`" not in str(p.refusal):
    failures.append("case 2c: a `breaks` that is not a list of tests was "
                    "not refused naming the field -- got %r" % p.refusal)

with tempfile.TemporaryDirectory() as tmp:
    moves = os.path.join(tmp, "moves")
    os.makedirs(moves)
    shutil.copy(os.path.join(REPO, "moves", "ROLES.json"), moves)
    with open(os.path.join(tmp, "p01.yaml"), "w") as h:
        h.write(m.yaml_write(EXTRACTION))
    with open(os.path.join(tmp, "p02.md"), "w") as h:
        h.write("# Extraction: old\n\n## Passage\n\nA sentence.\n")
    cwd = os.getcwd()
    os.chdir(tmp)
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            rc = m.main(["passage", "--from-extraction", "p01.yaml",
                         "--out", "run", "--select", "accept"])
        err = io.StringIO()
        with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
            rc_md = m.main(["passage", "--from-extraction", "p02.md", "--out", "run2"])
    finally:
        os.chdir(cwd)
    if rc_md == 0 or ".yaml" not in err.getvalue():
        failures.append("case 3: a Markdown Extraction was not refused by name "
                        "(rc %d, stderr %r)" % (rc_md, err.getvalue()))
    saved = os.path.join(moves, want["id"] + ".yaml")
    if rc != 0 or not os.path.isfile(saved):
        failures.append("case 3: the accepted Move did not land in %s (rc %d)"
                        % (saved, rc))
    else:
        if open(saved).read() != m.render_move(want) or m.read_saved(saved) != want:
            failures.append("case 3: the saved Move is not the derived record, "
                            "round-tripped: %r" % open(saved).read())
        index = open(os.path.join(moves, "INDEX.md")).read()
        if want["id"] not in index:
            failures.append("case 3: %s/INDEX.md was not regenerated" % moves)
        # case 3b: the shared example -- the composer's reader reads the
        # file the ingest's writer wrote.
        read = subprocess.run(
            ["node", "--input-type=module", "-e",
             "const { moveContract } = await import(process.argv[1]);"
             "process.stdout.write(JSON.stringify(moveContract(process.argv[2], process.argv[3])));",
             "file://" + os.path.join(REPO, "src", "compose.mjs"), want["id"], moves],
            capture_output=True, text=True)
        contract = json.loads(read.stdout or "{}") if read.returncode == 0 else {"error": read.stderr}
        lines = lambda state: "\n".join("%s: %s" % kv for kv in state.items())
        if contract.get("error") or contract.get("before") != lines(want["before"]) \
                or contract.get("after") != lines(want["after"]) \
                or contract.get("breaks") != want["breaks"] \
                or contract.get("segments") != want["segments"]:
            failures.append("case 3b: moveContract does not read the Move the ingest "
                            "wrote, one dimension per line -- got %r" % contract)

# case 4 (kogaki#1369): the old spelling `--from-analysis` is refused by
# name, naming `--from-extraction`, and is never read as the paragraph path.
err = io.StringIO()
with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
    rc = m.main(["passage", "--from-analysis", "p01.yaml", "--out", "run"])
if rc == 0 or "--from-analysis is retired" not in err.getvalue() \
        or "--from-extraction" not in err.getvalue():
    failures.append("case 4: --from-analysis was not refused naming "
                    "--from-extraction (rc %d, stderr %r)" % (rc, err.getvalue()))

if failures:
    for f in failures:
        print("FAIL: %s" % f)
    sys.exit(1)
print("ok: --from-extraction reads id, before, after, technique, breaks and segments "
      "off the Extraction record's name, reader (as maps keyed by dimension), "
      "technique, breaks and segments, refuses `contains` on a paragraph Extraction "
      "naming the field, refuses an Extraction missing `technique` naming the field, "
      "refuses a `breaks` that is not a list of tests naming the field, refuses a "
      "Markdown Extraction by name, and lands the accepted Move as a .yaml record "
      "and its INDEX.md in the one moves/ library, read back by moveContract one "
      "dimension per line (the shared example), and "
      "--from-analysis is refused naming --from-extraction "
      "(kogaki#1358, kogaki#1366, kogaki#1369, kogaki#1377, kogaki#1414, kogaki#1413)")
PY
); FARC=$?
printf '%s\n' "$FROM_EXTRACTION_OUT"
if [[ $FARC -ne 0 ]]; then
  exit 1
fi

echo "ok: ingestion fixture pass ran ${N} case(s) clean, exactly at its floor of ${FLOOR}; ${COUNT} shipped .yaml record(s) validate against the live kind set and ${RETIRED} retired .md record(s) are refused by name"
exit 0
