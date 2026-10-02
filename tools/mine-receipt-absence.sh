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
# is the review record's `boundary:` line class.
#
# BOTH GROUNDS THIS SITING WAS ARGUED FROM ARE GONE (kogaki#630, swept at
# kogaki#632). The neighbour this tool was sited beside, `tools/review-sweep.sh`,
# is retired, and `.claude/skills/review-lane/SKILL.md` — the artifact whose
# shape the argument said THIS repository authors — is retired with it. The
# siting stands and its argument does not: the tool still cannot travel,
# because its input is a record produced per-repository, but this repository no
# longer authors the shape of the half it parses. That shape travels with the
# method port, claude-toolkit#479, and has no verified definition anywhere at
# this head. `policy/consultation-map.md` carries the same correction; this
# header is the copy a reader of the tool reaches first, which is why it is
# corrected here rather than left to disagree.
#
# The original argument, kept as the record of what was withdrawn: the input
# was an artifact this repository authored and whose shape it owned, so the
# tool could not run in another
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
set -euo pipefail

REPORT_FILE=""
PR=""
MAP="policy/consultation-map.md"

while [ $# -gt 0 ]; do
  case "$1" in
    --report-file) REPORT_FILE="$2"; shift 2 ;;
    --pr)          PR="$2"; shift 2 ;;
    --map)         MAP="$2"; shift 2 ;;
    -h|--help)     sed -n '1,46p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$REPORT_FILE" ] && [ -z "$PR" ]; then
  echo "deny: give --report-file <path> or --pr <N>" >&2
  exit 2
fi

BODIES=""
if [ -n "$REPORT_FILE" ]; then
  BODIES="$(cat "$REPORT_FILE")"
elif [ -n "$PR" ]; then
  # The PR's own comments, and nothing else. No gateway read (AC6).
  BODIES="$(gh pr view "$PR" --json comments --jq '[.comments[].body] | join("\n")')"
fi

MINE_BODIES="$BODIES" MINE_PR="$PR" MINE_MAP="$MAP" \
python3 <<'PYEOF'
import os
import re
import sys

BODIES = os.environ.get("MINE_BODIES", "")
PR = os.environ.get("MINE_PR", "")
MAP = os.environ.get("MINE_MAP", "policy/consultation-map.md")

# THE DECLARED SHAPE, read at the shape kogaki#258 landed — never re-derived
# from prose. The prescribing artifact was `.claude/skills/review-lane/SKILL.md`,
# retired by kogaki#630; the shape's definition now travels with the method
# port (claude-toolkit#479) and is unverified from this tree (kogaki#632):
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
