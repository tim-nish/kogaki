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
LIVE=$(python3 -c "
import os, sys
sys.path.insert(0, 'tools')
import move_ingest as m
bad = []
for name in sorted(os.listdir('moves')):
    if not name.endswith('.md') or name == 'INDEX.md':
        continue
    path = os.path.join('moves', name)
    try:
        mapping = m.read_saved(path)
        m.check_field_set(mapping, 1)
        m.check_figure(mapping, 1)
    except Exception as exc:
        bad.append('%s: %s' % (path, exc))
        continue
    if m.render_move(mapping) != open(path).read():
        bad.append('%s: does not round-trip through the renderer' % path)
for line in bad:
    print(line)
print('COUNTED %d' % len([n for n in os.listdir('moves') if n.endswith('.md') and n != 'INDEX.md']))
" 2>&1) || { echo "FAIL: the live read over moves/ could not run"; printf '%s\n' "$LIVE"; exit 1; }
printf '%s\n' "$LIVE" | grep -v '^COUNTED ' || true
if grep -qv '^COUNTED ' <<<"$LIVE"; then
  echo "FAIL: a record in moves/ does not satisfy §6.9.0 condition 3 or §6.9.3 against the live kind set"
  exit 1
fi
COUNT=$(sed -n 's/^COUNTED \([0-9][0-9]*\)$/\1/p' <<<"$LIVE")
# THE EMPTY-SET REFUSAL IS RESTORED (kogaki#1187). It was suspended by
# kogaki#1175 only until moves/ was repopulated by the Corpus-to-Moves
# conversion; that conversion has now run (kogaki#1187) and moves/ carries
# the 21 Corpus-derived records, so a COUNT of zero is once again a FAIL
# rather than a deliberately-tolerated empty state.
if [[ -z "$COUNT" ]]; then
  echo "FAIL: the live read over moves/ produced no count line — the arm did not run"
  exit 1
fi
if [[ "$COUNT" -lt 1 ]]; then
  echo "FAIL: moves/ is empty — the live-record arm has nothing to validate (kogaki#1175's empty-set tolerance ended at kogaki#1187, which repopulated moves/)"
  exit 1
fi

# --------------------------------------------------------------------------
# `segments` (kogaki#1320) — the Passage-to-Move path copies the Analysis's
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
before: >-
  knowledge: holds nothing about the technique.
after: >-
  knowledge: holds the technique.
technique: >-
  demonstrates a simple reusable technique.
breaks: >-
  remove: the setup - the payoff lands for no reason.
  reorder: swap the two halves - the setup no longer earns the payoff.
  extend: add a third beat - the point dilutes.
"""

def fake_spawn(command, model, prompt, timeout_s, cwd=None):
    return MOVE_RECORD

m.spawn_model = fake_spawn

failures = []

# Case 1 — no Analysis at all: refused, naming `segments`.
tmp1 = tempfile.mkdtemp()
passage1 = os.path.join(tmp1, "bare.md")
with open(passage1, "w") as fh:
    fh.write("A bare Passage with no Analysis at all.\n")
try:
    m.run_passage(passage1, "specs/move-extraction-contract.md",
                  os.path.join(tmp1, "moves"), "stub", "stub-model",
                  os.path.join(tmp1, "out"), 60, select="accept")
    failures.append(
        "a record with no Analysis section 3 was accepted; it must be "
        "refused naming `segments`")
except m.Refusal as refusal:
    if "segments" not in str(refusal):
        failures.append(
            "the no-Analysis refusal does not name `segments` -- got: %s"
            % refusal)

# Case 2 — an Analysis with section 3: the saved Move renders `segments`
# as a numbered list, in section 3's own order.
tmp2 = tempfile.mkdtemp()
passage2 = os.path.join(tmp2, "analysed.md")
with open(passage2, "w") as fh:
    fh.write("""## 3. The order inside the Passage

1. "Opening words one" — raises — none — gives the reader an unanswered question.
2. "Opening words two" — settles — cause — answers it directly.

## 4. What the Passage presupposes

nothing beyond ordinary attention.
""")
moves_dir2 = os.path.join(tmp2, "moves")
try:
    m.run_passage(passage2, "specs/move-extraction-contract.md", moves_dir2,
                  "stub", "stub-model", os.path.join(tmp2, "out"), 60,
                  select="accept")
except m.Refusal as refusal:
    failures.append(
        "a record with an Analysis section 3 was refused -- %s" % refusal)
else:
    saved = os.path.join(moves_dir2, "test_move_segments.md")
    if not os.path.isfile(saved):
        failures.append("no Move was saved at %s" % saved)
    else:
        text = open(saved).read()
        expected = """segments: |-
  1. raises — none — gives the reader an unanswered question.
  2. settles — cause — answers it directly.
"""
        if expected not in text:
            failures.append(
                "`segments` did not render as a numbered list in section "
                "3's order -- saved file:\n%s" % text)

if failures:
    for f in failures:
        print("FAIL: %s" % f)
    sys.exit(1)
print(
    "ok: segments refused with no Analysis, naming the field; saved with "
    "an Analysis, numbered in section 3's order (kogaki#1320)")
PY
); SEGRC=$?
printf '%s\n' "$SEGMENTS_OUT"
if [[ $SEGRC -ne 0 ]]; then
  exit 1
fi

# --------------------------------------------------------------------------
# `--from-analysis` (kogaki#1358, design on kogaki#1329; one library,
# kogaki#1366). The fixture is built here in the shape of
# corpus/p1329/m2/..._cascades/p01.md, because corpus/ is ignored and CI
# never sees it. Three cases, each driving the act:
#   1. the derived record's id, before, after and segments are sections 7,
#      2 (changed rows only) and 3 of the Analysis;
#   2. a paragraph Analysis carrying `contains:` is refused naming the line;
#   3. `--select accept` lands the Move in the one `moves/` library and
#      regenerates `moves/INDEX.md`.
# --------------------------------------------------------------------------
FROM_ANALYSIS_OUT=$(python3 <<'PY'
import io, os, sys, tempfile, contextlib
sys.path.insert(0, "tools")
import move_ingest as m

ANALYSIS = """status: worked example (m2), written from the owner's notes

# Passage analysis: define_a_named_variable_with_almost_no_new_words

source: not given
unit: paragraph 1 of 11 in define_attack_defense_advantage_through_opposed_security_cascades
functions: settles, raises
length: 2 sentences, 1 paragraph

## Passage

A term is defined. Each of its states is defined as follows.

## 2. Reader before and after

| dimension   | before | after | Segment |
|-------------|--------|-------|---------|
| knowledge   | the first factor is named and not yet defined | the first factor is defined | 1 |
| question    | what is the first factor? | "what do its two states look like?" opened | 2 |
| expectation | the factors will be explained one at a time | unchanged | |
| orientation | a book explaining politics through named factors | unchanged | |
| trust       | neutral | unchanged | |

dimensions changed: 2

## 3. The order inside the Passage

1. "A term is defined" [gloss] — settles — elaboration — takes up item one of the preceding list and defines it.
2. "Each of its states" — raises — enumeration — tells the reader two items are coming.

## 7. Candidate name

define_a_named_variable_with_almost_no_new_words

## 8. Notes

none
"""

failures = []

p = m.derive_from_analysis(ANALYSIS)
want = {
    "id": "define_a_named_variable_with_almost_no_new_words",
    "before": "knowledge: the first factor is named and not yet defined. "
              "question: what is the first factor?",
    "after": "knowledge: the first factor is defined. "
             "question: \"what do its two states look like?\" opened.",
    "segments": "1. settles — elaboration — takes up item one of the preceding list and defines it.\n"
                "2. raises — enumeration — tells the reader two items are coming.",
}
if not p.admitted:
    failures.append("case 1: the p01-shaped Analysis was refused: %s" % p.refusal)
elif p.mapping != want:
    failures.append("case 1: derived %r, want %r" % (p.mapping, want))

with_contains = ANALYSIS.replace(
    "length: 2 sentences", "contains: a_slug, b_slug\nlength: 2 sentences")
p = m.derive_from_analysis(with_contains)
if p.admitted or "contains: a_slug, b_slug" not in str(p.refusal):
    failures.append("case 2: a paragraph Analysis carrying `contains:` was not "
                    "refused naming the line -- got %r" % p.refusal)

with tempfile.TemporaryDirectory() as tmp:
    moves = os.path.join(tmp, "moves")
    os.makedirs(moves)
    src = os.path.join(tmp, "p01.md")
    with open(src, "w") as h:
        h.write(ANALYSIS)
    cwd = os.getcwd()
    os.chdir(tmp)
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            rc = m.main(["passage", "--from-analysis", "p01.md",
                         "--out", "run", "--select", "accept"])
    finally:
        os.chdir(cwd)
    saved = os.path.join(moves, want["id"] + ".md")
    if rc != 0 or not os.path.isfile(saved):
        failures.append("case 3: the accepted Move did not land in %s (rc %d)"
                        % (moves, rc))
    else:
        if open(saved).read() != m.render_move(want) or \
                m.render_move(m.read_saved(saved)) != m.render_move(want):
            failures.append("case 3: the saved Move is not the derived record, "
                            "round-tripped: %r" % open(saved).read())
        index = open(os.path.join(moves, "INDEX.md")).read()
        if want["id"] not in index:
            failures.append("case 3: %s/INDEX.md was not regenerated" % moves)

if failures:
    for f in failures:
        print("FAIL: %s" % f)
    sys.exit(1)
print("ok: --from-analysis reads id, before, after and segments off sections 7, 2 "
      "and 3, refuses `contains:` on a paragraph Analysis naming the line, and "
      "lands the accepted Move and its INDEX.md in the one moves/ library (kogaki#1358, kogaki#1366)")
PY
); FARC=$?
printf '%s\n' "$FROM_ANALYSIS_OUT"
if [[ $FARC -ne 0 ]]; then
  exit 1
fi

echo "ok: ingestion fixture pass ran ${N} case(s) clean, exactly at its floor of ${FLOOR}; ${COUNT} shipped record(s) validate against the live kind set"
exit 0
