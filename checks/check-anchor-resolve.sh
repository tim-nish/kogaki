#!/usr/bin/env bash
# Cross-artifact anchor resolution (kogaki#635, owner ruling 2026-08-25).
#
# WHAT THIS REPLACES, AND WHY OUTRIGHT. `check-spec-pin-resolve.sh` resolved
# `<path>:<line>` pointers and is RETIRED by this member. That check worked and
# found real defects; the defect it could not reach is structural. A line number
# is a claim about an unrelated file's line count, so every edit to a target
# invalidated every pointer below it — one 2026-08-23 session paid four repoint
# passes — and the check could only say "resolves ELSEWHERE" where a pointer
# carried an adjacent verbatim quote of >=24 characters. A wrong pointer with no
# adjacent quote was indistinguishable from a right one, which is the population
# PR #626 round 1 finding 5 enumerated and nothing could report.
#
# THE FORM, per specs/SPEC.md §3.1: a cross-artifact pointer is
# `<path>::<anchor-token>`, refused unless the path exists AND contains the
# token literally AND exactly once. Under it the repoint passes do not get
# cheaper — they do not exist, because an anchor does not move when text above
# it does, and an anchor that stops resolving fails loudly instead of silently
# addressing whatever now occupies its line.
#
# THE RULE IS BORROWED, NOT MINTED. `checks/registry.json`'s efficacy citation
# has shipped this exact discipline since kogaki#243, resolved by
# `check-registry-conformance.sh`. Its reasoning is inherited wholesale and
# restated nowhere: literal substring never regex (these tokens are prose
# carrying punctuation nobody chose for matching), split on the FIRST `::`
# (labels routinely contain `:`, paths never contain `::`), and uniqueness is
# the binding rather than presence, because a citation resolving to whichever
# copy is found first is not a binding.
#
# THREE REFUSING DIRECTIONS, EACH FIXTURED (acceptance item 2, kogaki#635, plus
# the third this migration earned):
#   1. DANGLING  — the path is gone, or the token is absent from it.
#   2. DUPLICATE — the token occurs more than once, so it identifies nothing.
#   3. HEADING   — the token is a heading or § number, which §3.1 excludes
#                  because both renumber.
# A check that only refused direction 1 would pass a pointer that resolves
# ambiguously, which is the failure this form exists to remove. The third was
# added when this migration violated §3.1's heading exclusion thirteen times
# under prose that stated it — the count is here because a rule with a carrier
# and a rule without one are indistinguishable until one is broken.
#
# THE LAUNDERING CLASS, and why the migration that introduced this form is the
# reason the class has a name (PR #645 round 2). An anchor minted from a stale
# pin by reading the pin's CURRENT neighbourhood does not repair the pointer —
# it FREEZES the error into a form that resolves cleanly, so this checker will
# never raise it again. A detectably-wrong pointer becomes an undetectably
# wrong one, and the instrument reports green over exactly the defect the form
# was built to end.
#
# A bulk migration produced 39 of them in one act (PRs #645/#646), and the cause
# was ORDERING rather than judgment: §3.1 was inserted into specs/SPEC.md (57
# lines) BEFORE the migrator ran, so every pin below the insertion resolved ~50
# lines low and anchored to text the pin never named. Several of those pins were
# CORRECT at base and were broken by the very change claiming to repair them.
# THAT MIGRATION IS NOT IN THIS DIFF: it was reverted and the pointers left as
# the closed set §3.1 names, because three review rounds each found defects of
# this shape and the per-item correctness a mechanical rewrite cannot establish
# is exactly what the form is for.
#
# This checker cannot see the class by construction: a laundered anchor
# satisfies exactly-once, is not a heading, and its target exists. Detection
# lives at the MINT — resolve a pin against the tree the pin was WRITTEN
# against, never the tree you are editing — which is why the guard below is a
# mint-time discipline recorded here rather than a rule this file enforces.
# Stated because a class named only in a merged commit message is a class the
# next migration meets fresh.
#
# WHAT THIS DOES NOT DO, stated rather than left to be discovered:
#   * It does not judge whether the anchored text is what the citing sentence
#     MEANS. That is review's, exactly as it was under the retired member —
#     and the laundering class above is precisely why that limit is load-
#     bearing rather than a caveat: every laundered anchor passes here.
#   * It does not touch the HUB-FACING receipt grammar — `<repo>@<sha>
#     <file>:<line>` in consults, gate declarations and issue receipts. That is
#     the hub's boundary field (specs/SPEC.md §3.1, Out of scope), and a line
#     number there is correct until Gukan rules otherwise.
#   * It does not read a bare `:<line>` as a failure by itself, and that is
#     deliberate rather than provisional. The existing pointers are a CLOSED,
#     ENUMERATED SET (§3.1) draining by on-touch migration and by bounded
#     per-item passes where a human reads each pointer's sentence — never
#     mechanically, because a mechanical rewrite LAUNDERS a stale pin into a
#     cleanly-resolving wrong anchor this checker can never raise. Failing on
#     the count would force exactly that rewrite.
set -uo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PY'
import os, re, sys, pathlib, subprocess

# The ANCHOR corpus: where anchors are resolved and refused.
ROOTS = ["specs", "checks", "policy", "gates"]

# The CLOSED-SET denominator is a WHOLE-TREE scan, deliberately wider than
# ROOTS (§3.1). Pointers do not respect the anchor corpus's boundary: PR #648
# round 1 blocked on one in `.gitignore` that a section insertion had
# invalidated, invisible to every instrument, and a whole-tree scan found two
# more under `.local/stories/`. A completeness claim is only ever as wide as
# the enumeration behind it, so the number whose drain to zero closes
# kogaki#635 is counted over the tree rather than over the corpus.
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv"}

def tracked_files():
    """Every TRACKED file, which is what makes the closed-set count the SAME
    number in every clone. A working-directory walk counts untracked files a
    fresh checkout does not have — `.local/` here — so two environments
    disagree about when the drain is finished, and 'closes when the count
    reaches zero' names no single moment. Found by PR #649 round 1, whose own
    worktree rendered a different figure than this repository did."""
    try:
        out = subprocess.run(["git", "ls-files", "-z"], capture_output=True,
                             text=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return None
    return [f for f in out.split("\0") if f]

# `<path>::<token>` — the path half never contains whitespace or `::`.
ANCHOR = re.compile(r'`((?:[\w.-]+/)*[\w.-]+\.[A-Za-z0-9]+)::([^`]+)`')

# A bare internal pointer, for the count. The hub-facing receipt grammar is
# excluded TWO ways, and the second is path guessing — stated because the
# earlier wording claimed the first alone and a reader checking the count's
# meaning would have been misled about what it excludes:
#   1. a `<repo>@<sha>` token earlier on the same line (the receipt form), and
#   2. a path in the served-surface namespace (HUB_PREFIX / HUB_FILE below).
# Arm 2 is a guess, and it can be WRONG in one direction: an IN-TREE file whose
# path or basename collides with the served namespace is counted as a hub
# receipt rather than as a member of the closed set, so the count can UNDER-
# report. It never over-reports, which is the direction that matters for a
# number whose drain to zero closes kogaki#635 — an under-report leaves work
# visible as un-migrated pointers a later pass still meets.
BARE = re.compile(
    r'(?<![\w@/.-])((?:[\w.-]+/)*[\w.-]+\.(?:md|mjs|js|json|sh|py|yml|yaml|txt))'
    r'(:\d+(?:[-,]\d+)*)')
HUB_RECEIPT = re.compile(r'[\w.-]+@[0-9a-f]{7,64}\s')

# An ORPHANED CONTINUATION: a backticked bare `:<line>` or `:<line>-<line>` with
# no path of its own, which reads as an offset into whatever filename the prose
# named last. PR #645 round 1 found these surviving the migration BY NOT BEING
# SEEN: the BARE pattern above requires a path, so `at `:2915`` was invisible to
# the count while being exactly the thing the count claims is gone. A pointer
# that resolves from no tree at all is strictly worse than one that resolves
# wrongly, so the acceptance number counts it rather than the regex flattering
# itself. Kept distinct from BARE in the report, because they are different
# repairs: one has a target to anchor, the other must first recover which file
# it ever meant.
ORPHAN = re.compile(r'`(:\d+(?:[-,]\d+)*)`')
HUB_PREFIX = ("topics/", "gloss/", "q_a/", "journeys/", "lessons/")
HUB_FILE = ("LESSONS.md", "GLOSSARY.md", "ELEMENTS.jsonl", "INDEX.md",
            "SWEEP.md", "articles.md")

def is_hub(path, line, at):
    if HUB_RECEIPT.search(line[:at]):
        return True
    return path.startswith(HUB_PREFIX) or os.path.basename(path) in HUB_FILE

# The refusing fixtures are EXCLUDED from the corpus, because they exist to
# fail: scanning them would make every green run impossible and the exclusion
# is what lets the self-test above assert them directly instead.
FIXTURE_DIR = os.path.join("checks", "fixtures", "anchor-resolve")

def walk(roots=None):
    for root in (roots if roots is not None else ROOTS):
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in SKIP_DIRS]
            if os.path.normpath(dp) == os.path.normpath(FIXTURE_DIR):
                continue
            for fn in fns:
                p = os.path.join(dp, fn)
                try:
                    yield p, pathlib.Path(p).read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    continue

# §3.1: "Headings and § numbers are NOT anchors. Both renumber, which
# reproduces the defect one level up." That sentence had no carrier for the
# length of one migration, and the migration violated it thirteen times before
# anything said so — a markdown heading is the most distinctive line in its
# neighbourhood, so it is exactly what a proposer reaches for. The rule is
# therefore checked at the act rather than stated at the reader: prose that
# only a careful author honours is not in force.
HEADING = re.compile(r'^(?:#{1,6}\s|§?\d+(?:\.\d+)+\s)')

def resolve(path, token):
    """(ok, detail) — the borrowed exactly-once literal rule, plus §3.1's
    heading exclusion."""
    if HEADING.match(token):
        return False, ("anchor is a HEADING or § number — §3.1 excludes both "
                       "because they renumber, which is the defect one level up")
    if not os.path.exists(path):
        return False, "path does not exist"
    try:
        txt = pathlib.Path(path).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        return False, f"unreadable: {e}"
    n = txt.count(token)
    if n == 0:
        return False, "anchor absent — DANGLING"
    if n > 1:
        return False, f"anchor occurs {n} times — DUPLICATE, identifies nothing"
    return True, ""

fails, resolved, bare, hub, outside, orphan = [], 0, [], 0, [], []
# Anchors are resolved over ROOTS; the closed set is counted over the TREE.
# Two passes because the two questions have different scopes (§3.1), and
# collapsing them would make the count as narrow as the corpus — the defect
# PR #648 round 1 found.
for p, txt in walk():
    for i, line in enumerate(txt.splitlines(), 1):
        for m in ANCHOR.finditer(line):
            path, token = m.group(1), m.group(2).strip()
            ok, why = resolve(path, token)
            if ok:
                resolved += 1
            else:
                fails.append(f"{p}:{i}  {path}::{token[:60]} — {why}")
_tracked = tracked_files()
if _tracked is None:
    print("FAIL anchor resolve: `git ls-files` unavailable — the closed-set "
          "count is defined over the TRACKED tree and cannot be taken here; a "
          "working-directory fallback would render a different number than a "
          "clone, which is the defect the tracked scope exists to remove.")
    sys.exit(1)

def tracked_texts():
    for f in _tracked:
        if os.path.normpath(os.path.dirname(f)) == os.path.normpath(FIXTURE_DIR):
            continue
        try:
            yield f, pathlib.Path(f).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue

for p, txt in tracked_texts():
    for i, line in enumerate(txt.splitlines(), 1):
        for m in ORPHAN.finditer(line):
            orphan.append(f"{p}:{i}  {m.group(1)}")
        for m in BARE.finditer(line):
            if is_hub(m.group(1), line, m.start()):
                hub += 1
            elif not os.path.exists(m.group(1)):
                # OUT OF TREE. §3.1 governs pointers into THIS repository's
                # artifacts, and a target this tree does not contain is not one
                # — it is a cross-repository reference (a hook under
                # ~/.claude/, a sibling repo's file) or a grammar EXAMPLE in
                # the kit's own code (`FILE.md:1`). Neither is anchorable here:
                # the exactly-once rule is a claim about a file this checker
                # can open, so asserting it over a file it cannot read would be
                # the unbound claim the anchor form exists to remove, one level
                # up. Counted and named rather than silently dropped, because a
                # class excluded without a number is indistinguishable from a
                # class nobody looked for.
                outside.append(f"{p}:{i}  {m.group(1)}{m.group(2)}")
            else:
                bare.append(f"{p}:{i}  {m.group(1)}{m.group(2)}")

# SELF-TEST, run every time rather than in a mode nobody invokes: all THREE
# refusing directions asserted against fixtures that exist to fail. The count
# is written once here and once in the header; a stale figure beside the loop
# it describes is the drift this file's own subject is about.
FX = "checks/fixtures/anchor-resolve"
selftest = []
for name, want in (("dangling-anchor.md", "DANGLING"),
                   ("duplicate-anchor.md", "DUPLICATE"),
                   ("heading-anchor.md", "HEADING")):
    fp = os.path.join(FX, name)
    if not os.path.exists(fp):
        selftest.append(f"fixture missing: {fp}")
        continue
    body = pathlib.Path(fp).read_text(encoding="utf-8")
    got = [resolve(a.group(1), a.group(2).strip())
           for a in ANCHOR.finditer(body)]
    if not got:
        selftest.append(f"{name}: carries no anchor to refuse")
    elif all(ok for ok, _ in got):
        selftest.append(f"{name}: every anchor RESOLVED — the fixture asserts nothing")
    elif not any(want in why for ok, why in got if not ok):
        selftest.append(f"{name}: refused, but not as {want}")

if selftest:
    print("FAIL anchor resolve (SPEC.md §3.1, kogaki#635) — self-test:")
    for s in selftest:
        print(f"  - {s}")
    sys.exit(1)
if fails:
    print("FAIL anchor resolve (SPEC.md §3.1, kogaki#635):")
    for f in fails:
        print(f"  - {f}")
    sys.exit(1)

print(f"anchor resolve: {resolved} cross-artifact anchor(s) resolve, each "
      f"present in its target literally and EXACTLY ONCE; three refusing "
      f"directions (dangling, duplicate, heading) asserted against "
      f"fixtures that exist to fail. {hub} hub-facing receipt pointer(s) counted and NOT resolved "
      f"— the hub's boundary field, untouched by kogaki#635 and correct until "
      f"Gukan rules on its own carrier question. Bare internal `<file>:<line>` "
      f"pointers remaining: {len(bare)} — the CLOSED SET §3.1 names, counted over "
      f"the TRACKED tree rather than over this member's own corpus, so the "
      f"denominator is never narrower than the population (PR #648 round 1 "
      f"blocked on a pointer in .gitignore a corpus-scoped count could not "
      f"see). Counted rather than sampled and reported on every run, so both "
      f"its drain and any reintroduction are visible at the next green line "
      f"rather than at the next incident. kogaki#635 closes when this number "
      f"reaches zero, not when this member landed. Out-of-tree pointers, counted and NOT anchorable "
      f"because this checker cannot open their target: {len(outside)}. "
      f"Orphaned bare `:<line>` continuations, which carry no path and resolve "
      f"from no tree at all: {len(orphan)}.")
if orphan:
    print("  orphaned continuations (a line number with no filename of its "
          "own — the count's blind spot until PR #645 round 1 named it):")
    for o in orphan:
        print(f"    {o}")
if outside:
    print("  out-of-tree pointers (cross-repository references and grammar "
          "examples — named so the exclusion carries a number):")
    for o in outside:
        print(f"    {o}")
if bare:
    print("  bare internal pointers still present:")
    for b in bare:
        print(f"    {b}")
PY
