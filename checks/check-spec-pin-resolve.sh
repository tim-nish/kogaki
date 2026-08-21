#!/usr/bin/env bash
# Spec-prose pin resolution (kogaki#583, story 1.83).
#
# WHAT THIS IS FOR. This repository makes exactly one grounding promise —
# "Kogaki guarantees citation integrity — a quoted claim was quoted, and its
# pin resolves. Gukan guarantees the facts." (specs/SPEC.md:424-425) — and
# kogaki#583 records four instances in three sittings where the repository's
# OWN spec and clause prose broke it: accurate quotes over pointers that
# resolved elsewhere, nowhere, or carried no pin at all. Two of the four were
# introduced by the repair for another, which is why prose discipline is the
# wrong layer and this member exists. Same instrument class as the
# CanonicalDraft citation resolve check (specs/spec-draft-command/SPEC.md §6,
# story 1.81), one surface over.
#
# THE CORPUS is the repository's governing prose: specs/SPEC.md and
# specs/*/SPEC.md. Command files and checks quote the same way, but the four
# specimens are all spec prose and the corpus is bounded on purpose — widening
# is a decision for the sitting that finds a specimen outside it, not a free
# extension here.
#
# WHAT FAILS, AND WHAT ONLY REPORTS. Pointers classify into four populations,
# and only the first two can fail the check — the fail-set is exactly the
# class a spec amendment can introduce and this tree can verify:
#
#   1. LOCAL pointer (`file:line` / `file:line-line`, path present in this
#      tree): FAILS when the line range exceeds the file — the pointer
#      resolves nowhere.
#   2. LOCAL pointer with an ADJACENT VERBATIM QUOTATION (a double-quoted span
#      of >=24 characters, adjacency discriminated by SHAPE — see the window
#      comment in the resolver):
#      FAILS when the normalized quote is absent from the pointed-to range —
#      the pointer resolves, ELSEWHERE. This is kogaki#583 instances 1 and 2,
#      and PR #580 round 1's defect class.
#   3. SERVED pointer (a `<repo>@<sha>` token on the same line, or a path in
#      the served-surface namespace — LESSONS.md, GLOSSARY.md, SWEEP.md,
#      topics/, gloss/, lessons/, q_a/, articles.md): REPORTED, never
#      resolved here. The substrate is an enhancer, never a dependency
#      (CLAUDE.md, Policy seam), so a check that failed the tree on an
#      unreachable seam would make it one. Within this population, a BARE
#      served pointer — no `@<sha>` on its own line and none within the two
#      lines above — is counted and listed as its own report-only class:
#      kogaki#583 instance 3. Report-only is a DECISION, recorded in the
#      admission record: the tree holds ~100 of them today, and a member born
#      red on the whole corpus gates every PR on defects it did not introduce.
#      The count rendering here is what makes a later promotion to a failure
#      an evidence-backed act instead of a re-litigation.
#   4. CROSS-REPO / MACHINE-LOCAL mention (path absent and its leading
#      segment absent from this tree, e.g. `toolkit/commands/...`,
#      `write-review-grant.py`): REPORTED with a count. This tree cannot
#      resolve another repository's line numbers, and failing on them would
#      be asserting an absence from a file list.
#
# NOT CARRIED HERE, stated rather than implied: meaning defects no resolver
# decides — an ambiguous bare `(§N)` token (kogaki#583 instance 4), a quote
# paraphrased just far enough to miss the match, a pointer to the right file
# and wrong-but-in-range lines with no adjacent quote to catch it. Those stay
# with review. Served-pin CONTENT verification stays with the kit
# (policy/kit/bin/issue-pins.mjs) and the consult-receipt member; this member
# never fetches the seam.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== spec-prose pin resolution (kogaki#583)"

FAIL=0

# --- fixture pass: the counterfactuals run first, every run -----------------
# Each case CONSTRUCTS the defect and asserts this check's resolver REFUSES
# it (kogaki#243's efficacy contract). The fixtures are excluded from the
# corpus scan below by construction (the corpus is specs/**).
run_resolver() {
  python3 - "$@" <<'PYEOF'
#!/usr/bin/env python3
"""The resolver (kogaki#583, story 1.83). Pure function of the working tree:
no network, no seam fetch. The wrapper's header is the contract; this heredoc
only implements it, inline because an unregistered file in checks/ is dead
code by the registry's own conformance rule."""
import re
import sys
import pathlib

ROOT = pathlib.Path.cwd()

# A `<repo>@<sha>` pin token (short or full sha).
SERVED_PIN = re.compile(r"\b[\w.-]+@[0-9a-f]{7,40}\b")

# A file:line[-line] pointer. The path needs a directory component or a known
# extension so ordinary prose ratios ("5:1") never match.
POINTER = re.compile(
    r"(?<![\w@/])"
    r"((?:[\w.-]+/)*[\w.-]+\.(?:md|sh|mjs|py|json|yml|yaml)|tools/story-sync)"
    r":(\d+)(?:-(\d+))?"
)

# Served-surface namespace: hub files this tree never holds. A pointer whose
# path starts with one of these is served even with no pin on its line.
SERVED_NAMESPACE = re.compile(
    r"^(LESSONS\.md|GLOSSARY\.md|SWEEP\.md|articles\.md"
    r"|topics/|gloss/|lessons/|q_a/)"
)

# A verbatim quotation adjacent to a pointer: a double-quoted span of >= 24
# characters within the QUOTE_ADJACENCY window below. Curly and straight
# quotes both occur in this corpus.
QUOTE = re.compile(r'[“"]([^"“”]{24,})[”"]')

# Lines above the pointer searched for an adjacent pin. Wider than the quote
# window: `consulted:` blocks put the pin a line or two above the cite.
PIN_ADJACENCY = 2
# The quote window discriminates SHAPE, not distance (PR #586 round 1,
# finding 2). The corpus's dominant citation form is quote / blank line / pin,
# which a flat one-line window excludes — the founding specimen's own shape —
# while a flat two-line window pairs a quote with a pointer that never claimed
# it (specs/SPEC.md's kogaki#204-premise passage, where the intervening line
# is PROSE). So: the pointer's line, plus the line above, where a single
# BLANK line is skipped and a contiguous `>`-blockquote is taken whole; a
# quote separated by a non-blank prose line binds to nothing here.


def quote_present(q: str, hay: str) -> bool:
    """An elided quotation ("A … B") is honest when every kept segment
    appears at the target, in order — contiguity across an ellipsis is
    exactly what the quoter disclaimed (PR #586 round 1: 8 corpus
    quotations elide with … and all resolve correctly)."""
    pos = 0
    for seg in re.split(r"…|\.\.\.", q):
        seg = norm(seg)
        if len(seg) < 12:
            continue  # a fragment too short to discriminate binds nothing
        found = hay.find(seg, pos)
        if found < 0:
            return False
        pos = found + len(seg)
    return True


def norm(s: str) -> str:
    # Emphasis and quote markers are rendering, not content: a spec line
    # carrying **bold** or a backtick is the same claim as its unmarked
    # quotation (PR #586 round 1 surfaced 8 such pairs).
    s = re.sub(r"[*`_>]", "", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def scan_file(path: pathlib.Path, tree_root: pathlib.Path):
    """Yield (kind, lineno, pointer, detail) findings for one corpus file."""
    lines = path.read_text(errors="replace").splitlines()
    for i, ln in enumerate(lines, 1):
        pin_spans = [m.span() for m in SERVED_PIN.finditer(ln)]
        for m in POINTER.finditer(ln):
            target, a, b = m.group(1), int(m.group(2)), m.group(3)
            b = int(b) if b else a
            ptr = m.group(0)
            pinned_here = any(s[0] < m.start() for s in pin_spans)
            if pinned_here or SERVED_NAMESPACE.match(target):
                # population 3: served
                if pinned_here:
                    yield ("served-pinned", i, ptr, "")
                    continue
                context = lines[max(0, i - 1 - PIN_ADJACENCY): i]
                if any(SERVED_PIN.search(c) for c in context):
                    yield ("served-pinned", i, ptr, "pin within the adjacent block")
                else:
                    yield ("served-bare", i, ptr,
                           "bare served pointer — no @<sha> on its line or the "
                           f"{PIN_ADJACENCY} lines above")
                continue
            p = tree_root / target
            if not p.exists():
                head = target.split("/", 1)[0]
                if "/" not in target or not (tree_root / head).is_dir():
                    # population 4: cross-repo / machine-local mention
                    yield ("cross-repo", i, ptr, "")
                    continue
                yield ("fail", i, ptr,
                       f"resolves nowhere — {target} is not in the tree")
                continue
            body = p.read_text(errors="replace").splitlines()
            if b > len(body) or a < 1:
                yield ("fail", i, ptr,
                       f"resolves nowhere — {target} ends at line {len(body)}")
                continue
            # population 2: adjacent quotation must be present at the target
            ctx = [ln]
            j = i - 2
            if j >= 0 and not lines[j].strip():
                j -= 1  # a single blank line between quote and pointer
            if j >= 0:
                if lines[j].lstrip().startswith(">"):
                    while j >= 0 and lines[j].lstrip().startswith(">"):
                        ctx.append(lines[j].lstrip().lstrip(">"))
                        j -= 1
                else:
                    ctx.append(lines[j])
            context = " ".join(reversed(ctx))
            quotes = [q for q in QUOTE.findall(context)]
            if quotes:
                # widen the target window one line each way: a quote that
                # straddles the named line's neighbours is a sloppy pointer,
                # not a wrong one.
                lo, hi = max(0, a - 2), min(len(body), b + 1)
                hay = norm(" ".join(body[lo:hi]))
                for q in quotes:
                    if not quote_present(q, hay):
                        yield ("fail", i, ptr,
                               f"resolves elsewhere — the adjacent quote "
                               f"“{q[:60]}…” is not at {target}:{a}"
                               + (f"-{b}" if b != a else ""))
                        break
                else:
                    yield ("ok-quoted", i, ptr, "")
                continue
            yield ("ok", i, ptr, "")


def render(findings_by_file, label):
    counts = {"ok": 0, "ok-quoted": 0, "served-pinned": 0, "served-bare": 0,
              "cross-repo": 0, "fail": 0}
    failed = False
    for fname, findings in findings_by_file:
        for kind, lineno, ptr, detail in findings:
            counts[kind] += 1
            if kind == "fail":
                failed = True
                print(f"FAIL: {fname}:{lineno}  {ptr}  {detail}")
            elif kind == "served-bare":
                print(f"report: {fname}:{lineno}  {ptr}  {detail}")
    print(f"{label}: {counts['ok'] + counts['ok-quoted']} local pointers resolve "
          f"({counts['ok-quoted']} with their adjacent quote matched at the target), "
          f"{counts['fail']} fail, "
          f"{counts['served-pinned']} served pins (counted, never fetched), "
          f"{counts['served-bare']} bare served pointers (report-only), "
          f"{counts['cross-repo']} cross-repo mentions (report-only)")
    return failed


def main(argv):
    if argv[:1] == ["--scan"]:
        f = pathlib.Path(argv[1])
        failed = render([(str(f), list(scan_file(f, ROOT)))], "scan")
        return 1 if failed else 0
    if argv[:1] == ["--corpus"]:
        corpus = sorted(ROOT.glob("specs/SPEC.md")) + sorted(ROOT.glob("specs/*/SPEC.md"))
        pairs = [(str(f.relative_to(ROOT)), list(scan_file(f, ROOT))) for f in corpus]
        failed = render(pairs, f"corpus ({len(corpus)} spec files)")
        return 1 if failed else 0
    print("usage: spec-pin-resolve.py --corpus | --scan <file>", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
PYEOF
}

FIX=checks/fixtures/spec-pin-resolve
fixture_pass() {
  local out
  out=$(run_resolver --scan "$FIX/out-of-range.md" 2>&1)
  if ! grep -q "resolves nowhere" <<<"$out"; then
    echo "FAIL: fixture 'a pointer past the end of its file' was not refused"
    printf '%s\n' "$out"; FAIL=1
  fi
  out=$(run_resolver --scan "$FIX/wrong-pin.md" 2>&1)
  if ! grep -q "resolves elsewhere" <<<"$out"; then
    echo "FAIL: fixture 'an accurate quote over a pointer to different text' was not refused"
    printf '%s\n' "$out"; FAIL=1
  fi
  out=$(run_resolver --scan "$FIX/bare-served.md" 2>&1)
  if ! grep -q "bare served pointer" <<<"$out"; then
    echo "FAIL: fixture 'a served quotation carrying no pin' was not reported"
    printf '%s\n' "$out"; FAIL=1
  fi
  out=$(run_resolver --scan "$FIX/blank-line-shape.md" 2>&1)
  if ! grep -q "resolves elsewhere" <<<"$out"; then
    echo "FAIL: fixture 'a quotation a blank line above its pointer' was not refused — the blank-skip window is not being exercised"
    printf '%s\n' "$out"; FAIL=1
  fi
  [[ $FAIL -eq 0 ]] && echo "ok: fixture pass — 4 constructed defects, each refused or reported by name"
}
fixture_pass

# --- corpus scan ------------------------------------------------------------
OUT=$(run_resolver --corpus 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -ne 0 ]] && FAIL=1

# Disclosure, unconditional — a check that announced its limit only when it
# fired would be silent in exactly the state that misleads.
cat <<'EOF'
reach of this check, stated rather than implied: it resolves LOCAL file:line
pointers in specs/SPEC.md and specs/*/SPEC.md against this working tree, and
matches >=24-char double-quoted spans at their targets, with adjacency
discriminated by shape (blank-skip, >-blockquotes whole; never across prose)
and ellipses honored segment-wise — a quote beyond those shapes is review's.
Served pins
are counted, never fetched — content drift behind a valid-looking pin is the
kit's and the review lane's to catch. Bare served pointers and cross-repo
mentions are report-only classes with rendered counts; promoting either to a
failure is a decision act owed on its own issue, with these counts as its
evidence. Meaning defects (a bare `(§N)`, a paraphrase, wrong-but-in-range
lines with no quote) are judgment and stay with review.
EOF
exit $FAIL
