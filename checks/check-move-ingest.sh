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

# Case 1 — no Extraction at all: refused, naming `segments`.
tmp1 = tempfile.mkdtemp()
passage1 = os.path.join(tmp1, "bare.md")
with open(passage1, "w") as fh:
    fh.write("A bare Passage with no Extraction at all.\n")
try:
    m.run_passage(passage1, "specs/move-extraction-contract.md",
                  os.path.join(tmp1, "moves"), "stub", "stub-model",
                  os.path.join(tmp1, "out"), 60, select="accept")
    failures.append(
        "a record with no Extraction section 3 was accepted; it must be "
        "refused naming `segments`")
except m.Refusal as refusal:
    if "segments" not in str(refusal):
        failures.append(
            "the no-Extraction refusal does not name `segments` -- got: %s"
            % refusal)

# Case 2 — an Extraction with section 3, every entry carrying its content
# clause, its `does:` and, after the first, its `relation:` (kogaki#1414): the
# saved Move renders `segments` as a numbered list of the two prose fields,
# none of the content clauses (kogaki#1367), and Segment 1's recorded
# relation -- a fact about the source -- is not copied (kogaki#1411).
tmp2 = tempfile.mkdtemp()
passage2 = os.path.join(tmp2, "extracted.md")
with open(passage2, "w") as fh:
    fh.write("""## 3. The order inside the Passage

1. "Opening words one" — gives the reader an unanswered question about the book's own subject. — does: states a question the reader did not hold. — relation: takes up the source's earlier chapter.
2. "Opening words two" — answers the book's own question directly. — does: answers it directly. — relation: answers the question the step before raised.

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
        "a record with an Extraction section 3 was refused -- %s" % refusal)
else:
    saved = os.path.join(moves_dir2, "test_move_segments.md")
    if not os.path.isfile(saved):
        failures.append("no Move was saved at %s" % saved)
    else:
        text = open(saved).read()
        expected = """segments: |-
  1. does: states a question the reader did not hold.
  2. does: answers it directly. — relation: answers the question the step before raised.
"""
        if expected not in text:
            failures.append(
                "`segments` did not render as a numbered list of each "
                "Segment's does and relation in section 3's order -- saved "
                "file:\n%s" % text)
        if "book's own subject" in text or "book's own question" in text:
            failures.append(
                "`segments` carried a content clause -- saved file:\n%s" % text)
        if "earlier chapter" in text:
            failures.append(
                "`segments` carried Segment 1's relation, a fact about the "
                "source -- saved file:\n%s" % text)

# Case 3 — a §3 entry with only the content clause (no `does:`) is refused
# naming its Segment number (kogaki#1367, kogaki#1414).
tmp3 = tempfile.mkdtemp()
passage3 = os.path.join(tmp3, "extracted.md")
with open(passage3, "w") as fh:
    fh.write("""## 3. The order inside the Passage

1. "Opening words one" — gives the reader an unanswered question.
2. "Opening words two" — answers it directly. — does: answers it directly. — relation: answers the question before it.

## 4. What the Passage presupposes

nothing beyond ordinary attention.
""")
try:
    m.run_passage(passage3, "specs/move-extraction-contract.md",
                  os.path.join(tmp3, "moves"), "stub", "stub-model",
                  os.path.join(tmp3, "out"), 60, select="accept")
    failures.append(
        "a §3 entry carrying no `does:` was accepted; it must be refused "
        "naming the Segment's number")
except m.Refusal as refusal:
    if "Segment 1" not in str(refusal) or "does:" not in str(refusal):
        failures.append(
            "the no-`does:` refusal does not name Segment 1 and the field "
            "-- got: %s" % refusal)

# Case 3b — a Segment after the first with no `relation:` is refused naming
# its number (kogaki#1414).
tmp3b = tempfile.mkdtemp()
passage3b = os.path.join(tmp3b, "extracted.md")
with open(passage3b, "w") as fh:
    fh.write("""## 3. The order inside the Passage

1. "Opening words one" — gives the reader a question. — does: states a question.
2. "Opening words two" — answers it directly. — does: answers it directly.

## 4. What the Passage presupposes

nothing beyond ordinary attention.
""")
try:
    m.run_passage(passage3b, "specs/move-extraction-contract.md",
                  os.path.join(tmp3b, "moves"), "stub", "stub-model",
                  os.path.join(tmp3b, "out"), 60, select="accept")
    failures.append(
        "Segment 2 with no `relation:` was accepted; it must be refused "
        "naming the Segment's number")
except m.Refusal as refusal:
    if "Segment 2" not in str(refusal) or "relation:" not in str(refusal):
        failures.append(
            "the no-`relation:` refusal does not name Segment 2 and the "
            "field -- got: %s" % refusal)

# Case 4 — a supplied `segments` value disagreeing with the copy is refused
# as today.
tmp4 = tempfile.mkdtemp()
passage4 = os.path.join(tmp4, "extracted.md")
with open(passage4, "w") as fh:
    fh.write("""## 3. The order inside the Passage

1. "Opening words one" — gives the reader an unanswered question. — does: states a question the reader did not hold.

## 4. What the Passage presupposes

nothing beyond ordinary attention.
""")
disagreeing_record = MOVE_RECORD + "segments: |-\n  1. does: a disagreeing clause.\n"

def fake_spawn_disagreeing(command, model, prompt, timeout_s, cwd=None):
    return disagreeing_record

m.spawn_model = fake_spawn_disagreeing
try:
    m.run_passage(passage4, "specs/move-extraction-contract.md",
                  os.path.join(tmp4, "moves"), "stub", "stub-model",
                  os.path.join(tmp4, "out"), 60, select="accept")
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
    "Segment's does and relation, never the content clause or Segment 1's "
    "relation; refused naming the Segment's number with no `does:`, or with no "
    "`relation:` after the first; refused where a supplied `segments` disagrees "
    "with the copy; no retired label set in the format, the Extractor, the "
    "ingest or ParagraphPlan (kogaki#1320, kogaki#1367, kogaki#1414)")
PY
); SEGRC=$?
printf '%s\n' "$SEGMENTS_OUT"
if [[ $SEGRC -ne 0 ]]; then
  exit 1
fi

# --------------------------------------------------------------------------
# `--from-extraction` (kogaki#1358, design on kogaki#1329; one library,
# kogaki#1366). The fixture is built here in the shape of
# corpus/p1329/m2/..._cascades/p01.md, because corpus/ is ignored and CI
# never sees it. Cases, each driving the act:
#   1. the derived record's id, before, after, technique, breaks and segments
#      are sections 7, 2 (changed rows only), 6, 5 and 3 of the Extraction
#      (kogaki#1377 added technique and breaks);
#   2. a paragraph Extraction carrying `contains:` is refused naming the line;
#   2b. an Extraction missing section 6 is refused naming the section
#      (kogaki#1377);
#   2c. a section 5 line before its first `- ` test is refused naming the
#      section (kogaki#1414);
#   3. `--select accept` lands the Move in the one `moves/` library and
#      regenerates `moves/INDEX.md`.
# --------------------------------------------------------------------------
FROM_EXTRACTION_OUT=$(python3 <<'PY'
import io, os, sys, tempfile, contextlib
sys.path.insert(0, "tools")
import move_ingest as m

EXTRACTION = """status: worked example (m2), written from the owner's notes

# Extraction: define_a_named_variable_with_almost_no_new_words

source: not given
unit: paragraph 1 of 11 in define_attack_defense_advantage_through_opposed_security_cascades
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

1. "A term is defined" [gloss] — takes up item one of the preceding list and defines it. — does: takes up the first of a previously presented list of items and defines it. — relation: takes up the list the previous paragraph closed on.
2. "Each of its states" — tells the reader two items are coming. — does: announces that a fixed number of items follow.
   — relation: opens the defined item into its parts.

## 5. Where it would break

- drop the second sentence — the reader never learns the states exist.
- name the states before the factor — the reader has no term to hang
  them on.
- add a third state — the completeness claim breaks.

## 6. The technique, subject-free

Name the item once, then promise its full set of states before giving any one of them.

## 7. Candidate name

define_a_named_variable_with_almost_no_new_words

## 8. Notes

none
"""

failures = []

p = m.derive_from_extraction(EXTRACTION)
want = {
    "id": "define_a_named_variable_with_almost_no_new_words",
    "before": "knowledge: the first factor is named and not yet defined. "
              "question: what is the first factor?",
    "after": "knowledge: the first factor is defined. "
             "question: \"what do its two states look like?\" opened.",
    "segments": "1. does: takes up the first of a previously presented list of items and defines it.\n"
                "2. does: announces that a fixed number of items follow. — relation: opens the defined item into its parts.",
    "technique": "Name the item once, then promise its full set of states before giving any one of them.",
    "breaks": "- drop the second sentence — the reader never learns the states exist.\n"
              "- name the states before the factor — the reader has no term to hang them on.\n"
              "- add a third state — the completeness claim breaks.",
}
if not p.admitted:
    failures.append("case 1: the p01-shaped Extraction was refused: %s" % p.refusal)
elif p.mapping != want:
    failures.append("case 1: derived %r, want %r" % (p.mapping, want))

with_contains = EXTRACTION.replace(
    "length: 2 sentences", "contains: a_slug, b_slug\nlength: 2 sentences")
p = m.derive_from_extraction(with_contains)
if p.admitted or "contains: a_slug, b_slug" not in str(p.refusal):
    failures.append("case 2: a paragraph Extraction carrying `contains:` was not "
                    "refused naming the line -- got %r" % p.refusal)

# case 2b (kogaki#1377): an Extraction missing section 6 is refused naming
# the section, and nothing is proposed.
no_section6 = EXTRACTION.replace(
    """## 6. The technique, subject-free

Name the item once, then promise its full set of states before giving any one of them.

""", "")
p = m.derive_from_extraction(no_section6)
if p.admitted or "section 6" not in str(p.refusal):
    failures.append("case 2b: an Extraction with no section 6 was not refused "
                    "naming the section -- got %r" % p.refusal)

# case 2c (kogaki#1414): section 5 is a list of prose tests; text before its
# first `- ` test is refused naming the section, and nothing is proposed.
keyed_breaks = EXTRACTION.replace(
    "- drop the second sentence", "drop: the second sentence", 1)
p = m.derive_from_extraction(keyed_breaks)
if p.admitted or "section 5" not in str(p.refusal):
    failures.append("case 2c: a section 5 line before its first `- ` test was "
                    "not refused naming the section -- got %r" % p.refusal)

with tempfile.TemporaryDirectory() as tmp:
    moves = os.path.join(tmp, "moves")
    os.makedirs(moves)
    src = os.path.join(tmp, "p01.md")
    with open(src, "w") as h:
        h.write(EXTRACTION)
    cwd = os.getcwd()
    os.chdir(tmp)
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            rc = m.main(["passage", "--from-extraction", "p01.md",
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

# case 4 (kogaki#1369): the old spelling `--from-analysis` is refused by
# name, naming `--from-extraction`, and is never read as the paragraph path.
err = io.StringIO()
with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
    rc = m.main(["passage", "--from-analysis", "p01.md", "--out", "run"])
if rc == 0 or "--from-analysis is retired" not in err.getvalue() \
        or "--from-extraction" not in err.getvalue():
    failures.append("case 4: --from-analysis was not refused naming "
                    "--from-extraction (rc %d, stderr %r)" % (rc, err.getvalue()))

if failures:
    for f in failures:
        print("FAIL: %s" % f)
    sys.exit(1)
print("ok: --from-extraction reads id, before, after, technique, breaks and segments "
      "off sections 7, 2, 6, 5 and 3, refuses `contains:` on a paragraph Extraction "
      "naming the line, refuses an Extraction missing section 6 naming the section, "
      "refuses a section 5 line before its first `- ` test naming the section, "
      "and lands the accepted Move and its INDEX.md in the one moves/ library, and "
      "--from-analysis is refused naming --from-extraction "
      "(kogaki#1358, kogaki#1366, kogaki#1369, kogaki#1377, kogaki#1414)")
PY
); FARC=$?
printf '%s\n' "$FROM_EXTRACTION_OUT"
if [[ $FARC -ne 0 ]]; then
  exit 1
fi

echo "ok: ingestion fixture pass ran ${N} case(s) clean, exactly at its floor of ${FLOOR}; ${COUNT} shipped record(s) validate against the live kind set"
exit 0
