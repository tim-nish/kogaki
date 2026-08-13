#!/usr/bin/env bash
# Receipt-absence mining — a boundary touched with no receipt proposes the
# occasion that was missing (story 1.41, licensed by kogaki#262, umbrella
# kogaki#222).
#
# WHAT THIS MINES, AND WHY THE MAP'S OWN MISS LOOP CANNOT SEE IT. The
# consultation map grows from consultations that HAPPENED — receipts carry an
# `outcome` token and story 1.40's proposer harvests it. A consultation that
# never happened produces no receipt, so the half of the loop that would say
# "this boundary needed an occasion and nobody had one" is structurally
# invisible to receipt harvesting. The review lane's boundary-vs-receipt
# record is where that judgment already lives, once, before a human reads it
# and discards it. This reads that record.
#
# WHY IT LIVES IN `tools/` AND NOT IN THE KIT. Owner decision 2026-08-08
# (kogaki#222), recorded at `policy/consultation-map.md` §"`deferred-slot:
# proposer-siting` is FILLED". The axis is PORTABILITY: this proposer's input
# is `.claude/skills/review-lane/SKILL.md`'s `boundary:` record — an artifact
# THIS repository authors and whose shape it owns — so it cannot run in another
# kit-installing consumer, and a copy inside the kit would be a component whose
# input does not exist at the other end. Story 1.40's proposer reads only the
# hub's receipt grammar and is sited in `policy/kit/bin/` for the same reason
# read the other way.
#
# PROPOSAL-ONLY. This writes to `policy/consultation-map.md` never, under any
# flag (AC3). A proposer that admitted its own findings is the second authority
# the map's Invariant 2 refuses — "an entry that starts answering is a second
# authority growing in the dark"
# (`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299
# topics/knowledge-architecture.md:69`). Output is candidate text for the
# owner's admission gate and nothing else.
#
# IT NEVER READS GATEWAY STATE (AC6). The input is the lane's own report and
# this repository's own map. Reading gateway internals is mapped boundary
# ENTRY 2 of the very file this proposer exists to grow, and a proposer built
# to grow that file may not violate it.
#
# NOT A REGISTERED CHECK. A proposer is not a check: it gates nothing, denies
# nothing, and admitting one to `checks/registry.json` would need its own
# admission record naming a defect it catches. It catches none — it proposes.
#
# usage:
#   tools/mine-receipt-absence.sh --report-file <path> [--pr <N>]
#   tools/mine-receipt-absence.sh --pr <N>            # reads the PR's comments
#   tools/mine-receipt-absence.sh --self-test
set -euo pipefail

REPORT_FILE=""
PR=""
MAP="policy/consultation-map.md"
SELF_TEST=0

while [ $# -gt 0 ]; do
  case "$1" in
    --report-file) REPORT_FILE="$2"; shift 2 ;;
    --pr)          PR="$2"; shift 2 ;;
    --map)         MAP="$2"; shift 2 ;;
    --self-test)   SELF_TEST=1; shift ;;
    -h|--help)     sed -n '1,46p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ "$SELF_TEST" -eq 0 ] && [ -z "$REPORT_FILE" ] && [ -z "$PR" ]; then
  echo "deny: give --report-file <path>, --pr <N>, or --self-test" >&2
  exit 2
fi

BODIES=""
if [ -n "$REPORT_FILE" ]; then
  BODIES="$(cat "$REPORT_FILE")"
elif [ -n "$PR" ] && [ "$SELF_TEST" -eq 0 ]; then
  # The PR's own comments, and nothing else. No gateway read (AC6).
  BODIES="$(gh pr view "$PR" --json comments --jq '[.comments[].body] | join("\n")')"
fi

MINE_BODIES="$BODIES" MINE_PR="$PR" MINE_MAP="$MAP" MINE_SELF_TEST="$SELF_TEST" \
python3 <<'PYEOF'
import os
import re
import sys

BODIES = os.environ.get("MINE_BODIES", "")
PR = os.environ.get("MINE_PR", "")
MAP = os.environ.get("MINE_MAP", "policy/consultation-map.md")
SELF_TEST = os.environ.get("MINE_SELF_TEST") == "1"

# THE DECLARED SHAPE, read at the shape `.claude/skills/review-lane/SKILL.md`
# prescribes and kogaki#258 landed — never re-derived from prose:
#
#   boundary: <entry N> <covered|uncovered|cannot-determine> [receipt: <pin>]  <prose>
#   boundary: none
#
# ANCHORED WHOLE, on the same ground every adjacent declaration in this
# repository carries: a finding's prose discussing a boundary is a mention,
# never a declaration (kogaki#41).
BOUNDARY = re.compile(
    r'^\s*boundary:\s*(?P<entry>[0-9]+)\s+'
    r'(?P<verdict>covered|uncovered|cannot-determine)\s*'
    r'(?:\[receipt:\s*(?P<receipt>[^\]]+)\]\s*)?'
    r'(?P<prose>\S.*?)\s*$',
    re.MULTILINE)
BOUNDARY_NONE = re.compile(r'^\s*boundary:\s*none\s*$', re.MULTILINE)
REPORT = re.compile(r'^\s*review-lane report:\s*([0-9a-f]{7,40})\s*$', re.MULTILINE)

# The map's own entry headings. `### <N>. <title>` — the numbering the
# `boundary:` line's `<entry N>` names.
ENTRY_HEADING = re.compile(r'^###\s+(\d+)\.\s+(.+?)\s*$', re.MULTILINE)


def map_entries(path):
    """The live entry numbers and titles, read from the map itself.

    Read rather than hard-coded: the whole discriminator below turns on which
    entries the map CARRIES, and a copy of that list here would be a
    conformance copy with no declared precedence — which is the defect this
    map's own Invariant 1 refuses.
    """
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError as e:
        return None, f"could not read the map at {path}: {e}"
    return {int(n): t for n, t in ENTRY_HEADING.findall(text)}, None


def read_record(bodies):
    """The boundary record in these bodies, or a typed absence.

    Returns (rows, declared_none, present). `present` is FALSE when the bodies
    carry no `boundary:` declaration of either form — which is AC1a's whole
    subject and is NOT the same fact as an empty record.
    """
    rows = [m.groupdict() for m in BOUNDARY.finditer(bodies)]
    declared_none = bool(BOUNDARY_NONE.search(bodies))
    return rows, declared_none, bool(rows) or declared_none


def mine(bodies, entries, pr=""):
    """AC1, AC1a and AC2, in one pass.

    THE DISCRIMINATOR IS WHETHER `<entry N>` RESOLVES to a live entry in the
    map (decided at kogaki#262 before this code was written, with its two
    declined alternatives recorded there):

      resolves      -> AC2. The finding is an UNDISCHARGED OBLIGATION on that
                       PR — the review lane's own property — and not a proposal
                       to grow the map. Emitting one would grow the map by
                       duplicate.
      does not      -> AC1. The row names a boundary the map does not carry,
                       which is the missing occasion this story mines.

    Non-resolution is a DESIGNED, OBSERVABLE STATE rather than a malformed
    line: the declared shape says the entry number is the map's heading number
    AND that the prose names the title too, expressly so that "a renumbering of
    `policy/consultation-map.md` is visible in the record instead of silently
    re-pointing it at a different boundary".

    `covered` proposes nothing (AC1). `cannot-determine` proposes nothing
    either, and that is a decision rather than an omission: it says the lane
    could not decide, which is not evidence that an occasion is missing — the
    same fail-toward-honest direction the shape's own `covered`-without-a-
    receipt downgrade takes.
    """
    rows, declared_none, present = read_record(bodies)

    if not present:
        # AC1a. "No uncovered boundaries" and "I could not read the record" are
        # the same output otherwise, and the silent reading is the confident
        # wrong one.
        return {"state": "cannot-determine", "proposals": [], "obligations": [],
                "rows": 0}

    proposals, obligations = [], []
    for row in rows:
        if row["verdict"] != "uncovered":
            continue
        n = int(row["entry"])
        if n in entries:
            obligations.append((n, entries[n], row["prose"]))    # AC2
        else:
            proposals.append((n, row["prose"]))                  # AC1
    return {"state": "read", "proposals": proposals,
            "obligations": obligations, "rows": len(rows),
            "declared_none": declared_none}


def render(result, bodies, pr, entries):
    """The proposal text, in the map's own postmortem form.

    AC4 — the postmortem is filled as `not asked` and NO QUESTION IS INVENTED.
    The map's fourth disclosure case (kogaki#222) governs: a boundary was
    touched and no consultation happened at all, which is neither `recorded`
    (no query was issued), nor `reconstructed` (there is a live record, and
    inventing a question for it is exactly what that rule refuses), nor `none
    recorded` (scoped to a miss predating the map). THE ABSENT QUESTION IS THE
    FINDING; supplying one would delete it.

    AC5 — the derivation source travels with the proposal, so a
    machine-composed postmortem is legible as such at the admission gate.
    """
    out = []
    heads = REPORT.findall(bodies)
    source = f"review-lane report {heads[-1][:7]}" if heads else "a review-lane report"
    if pr:
        source += f" on PR #{pr}"

    if result["state"] == "cannot-determine":
        out.append("cannot-determine: this report carries NO `boundary:` "
                   "declaration of either form — neither a per-entry line nor "
                   "the declared `boundary: none`.")
        out.append("  Proposals: none, and that is NOT a finding of "
                   "\"no uncovered boundaries\" (AC1a).")
        out.append("  An ABSENT record and a DECLARED-EMPTY record are "
                   "different facts, and only the second says the lane looked.")
        out.append(f"  Source: {source}")
        return "\n".join(out)

    if result["declared_none"] and not result["rows"]:
        out.append("read: the report declares `boundary: none` — the lane "
                   "looked and no mapped boundary was touched.")
        out.append("  Proposals: none. The zero is declared, not silent.")
        out.append(f"  Source: {source}")
        return "\n".join(out)

    out.append(f"read: {result['rows']} boundary row(s) in {source}.")

    if result["obligations"]:
        out.append("")
        out.append("UNDISCHARGED OBLIGATIONS — reported, never proposed (AC2). "
                   "These rows name entries the map ALREADY carries, so the "
                   "finding is the PR's, not the map's:")
        for n, title, prose in result["obligations"]:
            out.append(f"  entry {n} ({title}) — uncovered")
            out.append(f"    {prose}")

    if not result["proposals"]:
        out.append("")
        out.append("PROPOSALS: none. Every uncovered row names an entry the "
                   "map already carries.")
        return "\n".join(out)

    out.append("")
    out.append("CANDIDATE MAP ENTRIES — PROPOSAL ONLY. Nothing here is "
               "admitted, and `policy/consultation-map.md` is not written "
               "(AC3). Each is for the owner's admission gate.")
    for n, prose in result["proposals"]:
        out.append("")
        out.append(f"  candidate: the occasion behind boundary row `entry {n}`")
        out.append(f"    what touched it: {prose}")
        out.append("    Miss postmortem:")
        out.append(f"      Violating artifact: {source}")
        out.append(f"      Triggering terms: NOT DERIVED — this proposal names "
                   f"no trigger terms, because a term the entry does not "
                   f"declare is a term nothing matches on.")
        out.append(f"      The question: not asked — derived from "
                   f"`{source}`, boundary row `entry {n}`.")
        out.append("        No question is given. A boundary was touched and "
                   "NO CONSULTATION HAPPENED AT ALL; the absent question is "
                   "the finding, and supplying one would delete it "
                   "(the map's fourth disclosure case, kogaki#222).")
        out.append(f"      Derived from: {source} — row `boundary: {n} "
                   f"uncovered`")
        out.append(f"    Why it is a PROPOSAL and not an obligation: entry {n} "
                   f"resolves to no live heading in {MAP} "
                   f"(entries present: {', '.join(str(k) for k in sorted(entries))}).")
    return "\n".join(out)


# --- the fixture pass (AC7) ------------------------------------------------
# DISCRIMINATES IN BOTH DIRECTIONS, which is what makes the rest evidence. It
# runs on every invocation and needs no network: a proposer whose only exercise
# is the live path is untested wherever that path is unavailable.
_ENTRIES = {1: "Check/CI infrastructure", 2: "Reading substrate state",
            3: "Record disposition"}
_HEAD = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"


def _report(*lines):
    return f"review-lane report: {_HEAD}\n" + "\n".join(lines)


_FX = []


def _case(name, bodies, entries, want_proposals, want_obligations, want_state):
    got = mine(bodies, entries)
    ok = (len(got["proposals"]) == want_proposals
          and len(got["obligations"]) == want_obligations
          and got["state"] == want_state)
    _FX.append((ok, name, got))
    return got


# AC1 — an uncovered row naming NO live entry PRODUCES a proposal.
_case("AC1: uncovered row naming an entry the map does not carry proposes",
      _report("boundary: 7 uncovered  the diff writes a release tag"),
      _ENTRIES, 1, 0, "read")

# AC2 — an uncovered row naming a LIVE entry produces NONE. This is the control
# that makes the case above evidence rather than decoration: both rows are
# `uncovered`, and only the entry's resolution differs.
_case("AC2: uncovered row naming a live entry proposes nothing",
      _report("boundary: 1 uncovered  the diff modifies a registered check"),
      _ENTRIES, 0, 1, "read")

# AC1 — a COVERED row proposes nothing, whatever its entry resolves to.
_case("AC1: a covered row proposes nothing",
      _report("boundary: 7 covered [receipt: product-lab@abc1234 x.md:1]  x"),
      _ENTRIES, 0, 0, "read")

# `cannot-determine` rows propose nothing — decided, not omitted.
_case("a cannot-determine row proposes nothing",
      _report("boundary: 7 cannot-determine  could not decide"),
      _ENTRIES, 0, 0, "read")

# AC1a — an UNDECLARED record is cannot-determine, never zero proposals.
_case("AC1a: a report with no boundary declaration is cannot-determine",
      _report("finding: should open  a finding, and no boundary record"),
      _ENTRIES, 0, 0, "cannot-determine")

# AC1a's control — a DECLARED-EMPTY record is NOT cannot-determine. An absent
# record and a declared-empty one are different facts, and the whole point of
# AC1a is that they must not render the same.
_case("AC1a control: `boundary: none` is READ, not cannot-determine",
      _report("boundary: none"),
      _ENTRIES, 0, 0, "read")

# USE VS MENTION — a finding's prose discussing a boundary declares nothing.
_case("use-vs-mention: prose mentioning a boundary is not a declaration",
      _report("finding: should open  the report should carry `boundary: 7 "
              "uncovered` and does not"),
      _ENTRIES, 0, 0, "cannot-determine")

# A `covered` WITHOUT a receipt is read as cannot-determine by the shape
# itself, so it must not reach the proposer as an uncovered row.
_case("a covered row without a receipt still proposes nothing",
      _report("boundary: 7 covered  no receipt named"),
      _ENTRIES, 0, 0, "read")

# Several boundaries in one report: every line is kept, not the first.
_g = _case("every row is kept, not the first",
           _report("boundary: 7 uncovered  first",
                   "boundary: 8 uncovered  second",
                   "boundary: 1 uncovered  third, a live entry"),
           _ENTRIES, 2, 1, "read")

_bad = [(n, g) for ok, n, g in _FX if not ok]
if _bad:
    print("FAIL fixture pass — the proposer does not discriminate as story "
          "1.41 states:")
    for n, g in _bad:
        print(f"  {n}: got {len(g['proposals'])} proposal(s), "
              f"{len(g['obligations'])} obligation(s), state {g['state']}")
    sys.exit(1)

# THE PROPOSAL'S OWN TEXT IS ASSERTED, not merely its count. AC4's whole
# content is a field that must NOT be filled, and a count cannot see a
# fabricated question.
_rendered = render(mine(_report("boundary: 7 uncovered  the diff writes a "
                               "release tag"), _ENTRIES),
                   _report("boundary: 7 uncovered  x"), "999", _ENTRIES)
_text_bad = []
if "not asked" not in _rendered:
    _text_bad.append("the postmortem does not carry the `not asked` case")
if "No question is given" not in _rendered:
    _text_bad.append("the proposal does not say that no question is given")
if "PROPOSAL ONLY" not in _rendered:
    _text_bad.append("the output does not declare itself proposal-only (AC3)")
if "PR #999" not in _rendered:
    _text_bad.append("the derivation source does not travel with the "
                     "proposal (AC5)")
if _text_bad:
    print("FAIL fixture pass — the rendered proposal does not carry what "
          "story 1.41 requires:")
    for f in _text_bad:
        print(f"  {f}")
    sys.exit(1)

# AC3 IS ASSERTED FROM THIS FILE'S OWN SOURCE, never from the comment claiming
# it. A proposer that grew a write path would pass every fixture above.
try:
    _src = open("tools/mine-receipt-absence.sh", encoding="utf-8").read()
except OSError as e:
    print(f"FAIL fixture pass — could not read this file to assert AC3: {e}")
    sys.exit(1)
if re.search(r"open\(\s*MAP", _src) or re.search(r'["\']w["\']\s*\)', _src):
    print("FAIL fixture pass — this file contains a WRITE path; AC3 makes "
          "`policy/consultation-map.md` unwritable by this proposer under any "
          "flag, and a proposer that admits its own findings is the second "
          "authority the map's Invariant 2 refuses")
    sys.exit(1)

# AND THE LIVE INVOCATION IS ASSERTED FROM SOURCE. Every case above calls
# `mine()` and `render()` directly, which proves the UNITS behave and is
# equally true of a build whose live path never calls them — a mutation
# deleting the final `print` survived the whole table until this block existed.
# Anchored on the call's own line shape, never on a bare name, because this
# block's own mention of it would otherwise be read as the evidence.
if not re.search(r"\nprint\(render\(mine\(BODIES, entries, PR\), BODIES, PR, "
                 r"entries\)\)\n", _src):
    print("FAIL fixture pass — the live path does not compose "
          "`render(mine(...))` and print it; the proposer would run, read its "
          "input, compute every proposal and emit nothing")
    sys.exit(1)

print(f"fixture pass: {len(_FX)}/{len(_FX)} discrimination cases (AC1 fires on "
      "an unresolved entry; AC2's control does NOT, differing only in whether "
      "the entry resolves; covered and cannot-determine rows propose nothing; "
      "AC1a's undeclared record is cannot-determine while its declared-empty "
      "control is READ; use-vs-mention; every row kept), plus the proposal's "
      "own text asserted for the `not asked` case, the absent question, the "
      "proposal-only declaration and the derivation source, and TWO source "
      "reads of this file — AC3's absent write path, and the live invocation "
      "actually composing and printing what the units compute")

if SELF_TEST:
    sys.exit(0)

entries, err = map_entries(MAP)
if err:
    print(f"cannot-determine: {err}")
    print("  Proposals: none. The map could not be read, so no row's entry "
          "number could be resolved — which is not the same fact as every row "
          "naming a live entry.")
    sys.exit(0)

if not BODIES.strip():
    print("cannot-determine: no report bodies were supplied.")
    sys.exit(0)

print()
print(render(mine(BODIES, entries, PR), BODIES, PR, entries))
PYEOF
