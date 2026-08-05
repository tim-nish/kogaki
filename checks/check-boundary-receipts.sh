#!/usr/bin/env bash
# The boundary-receipt binding at the merge layer (specs/SPEC.md §4, kogaki#25;
# story 1.11, licensed by kogaki#29).
#
# WHAT THIS GATES. A consultation-map boundary whose trigger terms MATCH this
# branch, with ZERO receipts present, FAILS. That is what converts the map from
# advice an agent may remember into a carrier that binds on every PR: an
# obligation generates no event to hook, but a PR is an event, so
# receipt-absence over a diff is a computable fact rather than an absence with
# nothing to observe (specs/SPEC.md §4; topics/knowledge-architecture.md:36).
#
# IT IS A PRESENCE CHECK OVER TWO DECLARED ENUMERATIONS and adds no judgment
# clause. The two enumerations are the map's entries and the branch's receipts;
# neither is inferred and both are named in the output below, because a
# coverage claim is a fraction OF an enumeration and one that hides its
# denominator cannot be read.
#
# IT NEVER BRANCHES ON THE OUTCOME TOKEN. A receipt satisfies this check
# whichever of the ratified triple it carries — `discriminating`,
# `covered-after-reframing`, `uncovered-after-N-framings` — because the
# obligation is TO ASK and never TO HAVE FOUND (specs/SPEC.md §4, as corrected
# for kogaki#32). A check that passed on some outcomes and failed on others
# would be judging whether the consultation SUCCEEDED, which is the review
# lane's property, not the merge layer's. The parse below cannot branch on it:
# it never reads past line one.
#
# LINE ONE ONLY (kogaki#28, story 1.10). The v2 receipt puts `request_id`,
# `outcome` and `query:` on indented continuation lines and leaves line one
# unchanged from v1. Presence is decidable from the `consulted:` line alone, so
# this check reads nothing else and stays independent of the block's internals
# — a later amendment to what rides inside the block cannot break the boundary
# binding. `check-consult-receipts.sh` is the file that validates the block;
# the split is deliberate and is why that check's contract is not absorbed here.
#
# IT BINDS PRESENCE, NOT ORDER. It asserts a consultation was RECORDED on the
# branch, and asserts nothing about WHEN, relative to the work. A receipt
# written after the code it was supposed to precede satisfies this exactly as
# one written before it. Nothing in this repository observes that ordering —
# not this check, not the read prescription, not the review lane — and it is
# stated here so a later reader does not assume the binding covers it.
# (Observed live: the story-1.10 branch ran entry 1's read prescription AFTER
# writing the check it governs, and the receipt is indistinguishable from one
# emitted before.)
#
# AND THE ATTRIBUTION HALF IS CARRIER-LESS, MARKED RATHER THAN OMITTED. A
# receipt's line one names a PIN (`<repo>@<sha> <file:line>`), never a boundary,
# so nothing mechanically ties receipt R to boundary B. This check therefore
# asserts that the branch carries at least one receipt when any boundary
# matched — N matched boundaries are satisfied by one receipt, and a branch
# touching two boundaries while consulting only one passes. Carrier-less by
# omission is the defect; carrier-less with a reopen trigger is admissible
# (topics/knowledge-architecture.md:52@ed47fbd). Reopen trigger: one PR that
# matched two or more boundaries, carried a receipt for only one of them, and
# shipped a defect the unconsulted boundary would have caught. The honest fix
# then is a receipt that names its boundary, which is a grammar change owned by
# the receipt spec rather than a clause this file can add on its own.
#
# FALSE POSITIVES ARE ACCEPTED AND DISCHARGED, NOT NARROWED AWAY. A trigger
# term appearing incidentally fires the gate, and the remedy is the same act a
# real match asks for: record a receipt. `uncovered-after-N-framings` is a
# conforming answer, so a spurious match costs one consultation rather than a
# false verdict — the map's own ratified accretion polarity, preserved at gate
# severity (owner decision, story 1.11 implementation). Narrowing the match to
# diff paths alone was the considered alternative and was declined: it would
# silently shrink what the map binds.
#
# THE SOURCE SET IS DECLARED, AND SO IS WHAT IT COULD NOT READ. Trigger terms
# match against diff paths, changed text (commit messages and the PR body), and
# the linked issue body. Where a source is unavailable the check SAYS SO rather
# than reporting a clean pass over a smaller denominator — an instrument that
# reports absence without establishing it is the defect
# `check-review-report.sh` refuses one layer up.
#
# Tier is `ci`: the PR body and the linked issue are part of the substrate, and
# neither exists at push time. A check's position in the loop is a cost
# decision (`a-checks-runtime-multiplies-by-its-loop-position`).
set -euo pipefail
cd "$(dirname "$0")/.."

MAP="policy/consultation-map.md"

# Commit range: CI supplies the base; locally fall back to the default branch.
# Same resolution as check-consult-receipts.sh, which is deliberate — the two
# checks read the same branch and disagreeing about what "this branch" means
# would be a defect neither could see.
BASE="${CONSULT_BASE_SHA:-}"
HEAD_REF="${CONSULT_HEAD_SHA:-HEAD}"
if [ -z "$BASE" ]; then
  BASE="$(git merge-base origin/master "$HEAD_REF" 2>/dev/null \
          || git merge-base master "$HEAD_REF" 2>/dev/null || true)"
fi

if [ -n "$BASE" ]; then
  paths="$(git diff --name-only "$BASE..$HEAD_REF" 2>/dev/null || true)"
  commits="$(git log --format='%B' "$BASE..$HEAD_REF" 2>/dev/null || true)"
  range_desc="$(git rev-list --count "$BASE..$HEAD_REF" 2>/dev/null || echo 0) commit(s)"
else
  paths="$(git show --name-only --format= "$HEAD_REF" 2>/dev/null || true)"
  commits="$(git log -1 --format='%B' "$HEAD_REF")"
  range_desc="1 commit (no merge base found)"
fi

body="${CONSULT_PR_BODY:-}"

# The linked issue body — the third declared source. Supplied directly when the
# caller has it; otherwise resolved from the licensing issue named in the PR
# body or commits, and only when `gh` can actually look. Unavailability is
# REPORTED below, never silently treated as an empty source.
issue_body="${BOUNDARY_ISSUE_BODY:-}"
issue_note="not supplied"
if [ -n "$issue_body" ]; then
  issue_note="supplied by the caller"
elif [ "${BOUNDARY_SKIP_ISSUE_LOOKUP:-}" = "1" ]; then
  issue_note="lookup skipped (BOUNDARY_SKIP_ISSUE_LOOKUP=1)"
else
  _n="$(printf '%s\n%s\n' "$body" "$commits" \
        | grep -oiE '(closes|fixes|resolves|license:?)[[:space:]]*#[0-9]+' \
        | grep -oE '[0-9]+' | head -1 || true)"
  if [ -z "$_n" ]; then
    issue_note="no linked issue named in the PR body or commits"
  elif ! command -v gh >/dev/null 2>&1; then
    issue_note="issue #$_n named but gh is not available — NOT READ"
  elif issue_body="$(gh issue view "$_n" --json body -q .body 2>/dev/null)"; then
    issue_note="issue #$_n"
  else
    issue_body=""
    issue_note="issue #$_n named but the gh lookup FAILED — NOT READ"
  fi
fi

BOUNDARY_MAP="$MAP" \
BOUNDARY_PATHS="$paths" \
BOUNDARY_TEXT="$commits
$body" \
BOUNDARY_ISSUE="$issue_body" \
BOUNDARY_ISSUE_NOTE="$issue_note" \
BOUNDARY_RANGE="$range_desc" \
python3 <<'EOF'
import os, re, sys

# --- the map's declared enumeration -----------------------------------------
# An entry is `### <n>. <title>` plus a `- **Trigger terms:** ...` field, whose
# value may wrap across lines until the next `- **Field:**` bullet.
ENTRY = re.compile(r'^###\s+(\d+)\.\s+(.+?)\s*$', re.MULTILINE)
TRIGGER = re.compile(
    r'^-\s+\*\*Trigger terms:\*\*\s*(.*?)(?=^\s*-\s+\*\*|\Z)',
    re.MULTILINE | re.DOTALL)

# --- the branch's receipts ---------------------------------------------------
# LINE ONE ONLY. Nothing below reads a continuation line, which is what makes
# the outcome-invariance clause structural rather than a promise.
RECEIPT = re.compile(r'^\s*consulted:\s*\S+@[0-9a-f]{7,40}\s+\S', re.MULTILINE)
# A fenced block is quotation (mention), never emission (use) — kogaki#41, the
# PR #40 false positive. Same rule as check-consult-receipts.sh: a spec or PR
# body documenting the grammar is the one text guaranteed to contain
# non-receipt matches. An unclosed fence strips to end of text.
FENCE = re.compile(r'^[ \t]*(`{3,}|~{3,}).*?(?:^[ \t]*\1[ \t]*$|\Z)',
                   re.MULTILINE | re.DOTALL)


def parse_map(text):
    """Return [(number, title, [terms])] — the declared boundary enumeration."""
    entries = []
    marks = list(ENTRY.finditer(text))
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        section = text[m.start():end]
        t = TRIGGER.search(section)
        if not t:
            continue
        raw = ' '.join(t.group(1).split())
        terms = [x.strip() for x in raw.split(',') if x.strip()]
        entries.append((m.group(1), m.group(2), terms))
    return entries


def term_pattern(term):
    """Word-bounded, case-insensitive, whitespace-tolerant.

    Bounded on both ends because a bare substring match makes short terms
    ('CI', 'gate') fire on 'specific' and 'delegate' — a false-positive class
    that is not the accepted one. The accepted class is a term genuinely
    present but incidental; a term that is not present at all must never match.
    """
    return re.compile(
        r'(?<![A-Za-z0-9_])' + r'\s+'.join(re.escape(w) for w in term.split())
        + r'(?![A-Za-z0-9_])', re.IGNORECASE)


def match_boundaries(entries, sources):
    """Return [(number, title, [(term, source_name)])] for matched entries."""
    matched = []
    for number, title, terms in entries:
        hits = []
        for term in terms:
            pat = term_pattern(term)
            for name, text in sources:
                if text and pat.search(text):
                    hits.append((term, name))
                    break
        if hits:
            matched.append((number, title, hits))
    return matched


def count_receipts(text):
    """Receipts present on the branch, mentions excluded."""
    return len(RECEIPT.findall(FENCE.sub('', text or '')))


# ---------------------------------------------------------------------------
# Fixture pass — the discrimination evidence, run every invocation and needing
# no network. BOTH discriminating cases are exercised: a matched boundary with
# a receipt (passes) and a matched boundary with none (fails). A gate whose
# failing path is never fired is the orphan-guard shape kogaki#6 was filed to
# end. The fixture map is synthetic so the fixtures do not move when the real
# map gains an entry.
# ---------------------------------------------------------------------------
FIXTURE_MAP = """
### 1. Check/CI infrastructure

- **Trigger terms:** check, registry, gate script
- **Read prescription:** irrelevant here.

### 2. Reading substrate state

- **Trigger terms:** access log, consult evidence
- **Read prescription:** irrelevant here.
"""
RECEIPT_LINE = "consulted: product-lab@0123abc topics/example.md:1"
V2_RECEIPT = (RECEIPT_LINE + "\n  request_id: r\n"
              "  outcome: uncovered-after-2-framings\n"
              "  query: first\n  query: second\n")
FENCED_ONLY = "```\nconsulted: <repo>@<sha> <file:line>\n```\n"

FIXTURE_ENTRIES = parse_map(FIXTURE_MAP)

# (name, paths, text, issue, want_matched_numbers, want_receipts)
FIXTURES = [
    ("no boundary matched: clean branch, no receipt needed",
     "docs/readme.md", "prose about nothing mapped", "", [], 0),
    ("matched by diff path + receipt present: passes",
     "checks/check-thing.sh", RECEIPT_LINE, "", ["1"], 1),
    ("matched by diff path, ZERO receipts: this is the failing case",
     "checks/check-thing.sh", "implement the thing", "", ["1"], 0),
    ("matched by changed text alone (no path signal) still binds",
     "docs/readme.md", "touches the registry shape", "", ["1"], 0),
    ("matched by the linked issue body alone still binds",
     "docs/readme.md", "prose", "we should read the access log", ["2"], 0),
    ("outcome is never read: an `uncovered` receipt satisfies exactly as any",
     "checks/check-thing.sh", V2_RECEIPT, "", ["1"], 1),
    ("line one only: the continuation block is not required for presence",
     "checks/check-thing.sh", RECEIPT_LINE, "", ["1"], 1),
    ("a fenced receipt is a MENTION: matched boundary, zero receipts",
     "checks/check-thing.sh", FENCED_ONLY, "", ["1"], 0),
    ("two boundaries can match at once",
     "checks/check-thing.sh", "and the access log", "", ["1", "2"], 0),
    ("word-bounded: 'specific' does not fire the 'CI' class of substring hit",
     "docs/specific-notes.md", "a specification, delegated", "", [], 0),
]

failures = []
for name, fpaths, ftext, fissue, want_nums, want_receipts in FIXTURES:
    got = match_boundaries(FIXTURE_ENTRIES,
                           [("diff paths", fpaths), ("changed text", ftext),
                            ("linked issue body", fissue)])
    got_nums = [n for n, _, _ in got]
    got_receipts = count_receipts(ftext)
    if got_nums != want_nums or got_receipts != want_receipts:
        failures.append(f"{name}: got (boundaries={got_nums}, "
                        f"receipts={got_receipts}), want "
                        f"({want_nums}, {want_receipts})")

if failures:
    print("FAIL fixture pass — the binding does not discriminate:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print(f"fixture pass: {len(FIXTURES)}/{len(FIXTURES)} discrimination cases "
      "(matched+receipt / matched+none, both fired; path, text and issue-body "
      "sources; outcome-invariance; line-one-only; use-vs-mention; word bounds)")

# ---------------------------------------------------------------------------
# The live pass.
# ---------------------------------------------------------------------------
map_path = os.environ["BOUNDARY_MAP"]
try:
    with open(map_path, encoding="utf-8") as fh:
        map_text = fh.read()
except OSError as exc:
    # COULD NOT ESTABLISH. The map is this check's own denominator, so a
    # missing one is not "no boundaries matched" — it is an instrument that
    # cannot look, and it does not get to report absence.
    print(f"FAIL could not establish the substrate: {map_path} unreadable "
          f"({exc}). A boundary set that cannot be read is not an empty one.")
    sys.exit(1)

entries = parse_map(map_text)
if not entries:
    print(f"FAIL could not establish the substrate: {map_path} declares no "
          "parseable entries. An empty parse of a non-empty map is a schema "
          "drift, not a clean branch.")
    sys.exit(1)

paths = os.environ.get("BOUNDARY_PATHS", "")
text = os.environ.get("BOUNDARY_TEXT", "")
issue = os.environ.get("BOUNDARY_ISSUE", "")
issue_note = os.environ.get("BOUNDARY_ISSUE_NOTE", "not supplied")
rng = os.environ.get("BOUNDARY_RANGE", "unknown range")

matched = match_boundaries(entries, [("diff paths", paths),
                                     ("changed text", text),
                                     ("linked issue body", issue)])
receipts = count_receipts(text)

print(f"sources read: diff paths + changed text (commit messages, PR body) "
      f"over {rng}; linked issue body: {issue_note}")
print(f"boundaries declared: {len(entries)} in {map_path}")

if not matched:
    print(f"ok: no mapped boundary matched this branch; "
          f"{receipts} receipt(s) present (not required)")
    sys.exit(0)

names = "; ".join(
    f"#{n} {title} (matched on '{hits[0][0]}' in {hits[0][1]})"
    for n, title, hits in matched)

if receipts == 0:
    print(f"FAIL: {len(matched)} mapped boundary/boundaries matched this "
          f"branch and NO consult receipt is present — {names}.")
    print("The map binds at the merge layer: a touched boundary owes a "
          "consultation (specs/SPEC.md §4, kogaki#25). Record a receipt on "
          "the branch — line one is enough for this check:")
    print("  consulted: <repo>@<sha> <file:line>")
    print("Any ratified outcome satisfies it, `uncovered-after-N-framings` "
          "included: the obligation is to ask, never to have found. If the "
          "match is incidental, the receipt recording that you looked is "
          "still the discharge — that is the accepted cost of binding at "
          "gate severity.")
    sys.exit(1)

print(f"ok: {len(matched)} mapped boundary/boundaries matched and "
      f"{receipts} receipt(s) present — {names}")
print("not carried here, stated rather than implied: WHICH boundary each "
      "receipt covers. Line one names a pin, never a boundary, so one receipt "
      "satisfies every matched boundary on the branch; a PR touching two "
      "boundaries and consulting one passes. Reopen trigger in the header.")
print("also not carried here: whether the RIGHT question was asked — that is "
      "judgment and stays in the review lane.")
EOF
