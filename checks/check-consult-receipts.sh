#!/usr/bin/env bash
# Consult-receipt reporting: counts the branch's `consulted:` receipts and
# reports them. A REPORT, never a gate on the count — an absent consultation
# generates no event to hook, so the remedy is making the absence observable.
# Zero renders as an explicit zero.
#
# Reads only git-resident text (commit messages, and the PR body when CI
# supplies it). It never reads ~/.tsurezure/ or any gateway state: the
# substrate's access log is the SERVER's record, Kogaki's receipts are the
# consumer's (specs/SPEC.md §4 sided-evidence clause;
# policy/consultation-map.md entry 2). kogaki#7, story 1.3.
#
# Fails only on a malformed receipt — a `consulted:` line whose pin is not
# `<repo>@<sha> <file:line[,line…]>` shaped.
#
# USE vs MENTION (kogaki#41): a `consulted:` line inside a fenced code block
# is a QUOTATION of the format, not an emission of a receipt — the scanned
# population is receipts, and a spec or PR body documenting the grammar is
# the one text guaranteed to contain non-receipt matches (PR #40, the first
# false positive: the grammar template's literal `<repo>@<sha>` placeholders
# flagged as malformed). Fenced regions are stripped before scanning; an
# unclosed fence strips to end of text, since a half-open quotation cannot
# be safely read as emission either. The embedded fixture pass below is the
# discrimination evidence, run on every invocation.
set -euo pipefail
cd "$(dirname "$0")/.."

# Commit range: CI supplies the base; locally fall back to the default branch.
BASE="${CONSULT_BASE_SHA:-}"
HEAD_REF="${CONSULT_HEAD_SHA:-HEAD}"
if [ -z "$BASE" ]; then
  BASE="$(git merge-base origin/master "$HEAD_REF" 2>/dev/null \
          || git merge-base master "$HEAD_REF" 2>/dev/null || true)"
fi

if [ -n "$BASE" ]; then
  commits="$(git log --format='%B' "$BASE..$HEAD_REF" 2>/dev/null || true)"
  range_desc="$(git rev-list --count "$BASE..$HEAD_REF" 2>/dev/null || echo 0) commit(s)"
else
  commits="$(git log -1 --format='%B' "$HEAD_REF")"
  range_desc="1 commit (no merge base found)"
fi

# The PR body, when CI provides it — receipts often ride there rather than in
# a commit message.
body="${CONSULT_PR_BODY:-}"

CONSULT_SOURCE="$commits
$body" CONSULT_RANGE="$range_desc" python3 <<'EOF'
import os, re, sys

# A receipt: `consulted: <repo>@<sha> <file:line[,line][, file:line…]>`
RECEIPT = re.compile(r'^\s*consulted:\s*(.+)$', re.MULTILINE)
PIN = re.compile(r'^(\S+)@([0-9a-f]{7,40})\s+(\S.*)$')
# A fenced code block is quotation (mention), never emission (use).
# An unclosed fence strips to end of text.
FENCE = re.compile(r'^[ \t]*(`{3,}|~{3,}).*?(?:^[ \t]*\1[ \t]*$|\Z)',
                   re.MULTILINE | re.DOTALL)


def scan(source):
    """Return (receipts, malformed) over the emission text only."""
    emitted = FENCE.sub('', source)
    receipts = [m.group(1).strip() for m in RECEIPT.finditer(emitted)]
    malformed = [r for r in receipts if not PIN.match(r)]
    return receipts, malformed


# ---------------------------------------------------------------------------
# Fixture pass — the discrimination evidence, run every invocation. Case (b)
# is the kogaki#41 false positive: it FAILS the pre-fix scanner, which is
# what makes this a discriminating fixture rather than a passing one.
# ---------------------------------------------------------------------------
GOOD = "consulted: product-lab@0123abc topics/example.md:1"
TEMPLATE_FENCED = ("Docs quoting the grammar:\n```\n"
                   "consulted: <repo>@<sha> <file:line[,line][, file:line…]>\n"
                   "```\nprose after.")
BAD_REAL = "consulted: this is not a pin"
FIXTURES = [
    ("real receipt counted", GOOD, 1, 0),
    ("fenced template is a mention: not counted, not malformed",
     TEMPLATE_FENCED, 0, 0),
    ("real receipt beside a fenced template: exactly one counted",
     GOOD + "\n" + TEMPLATE_FENCED, 1, 0),
    ("malformed real receipt outside a fence still fails",
     BAD_REAL, 1, 1),
    ("unclosed fence strips to end", "```\n" + GOOD, 0, 0),
]
fixture_failures = []
for name, src, want_count, want_bad in FIXTURES:
    got, bad = scan(src)
    if (len(got), len(bad)) != (want_count, want_bad):
        fixture_failures.append(
            f"{name}: got ({len(got)} receipts, {len(bad)} malformed), "
            f"want ({want_count}, {want_bad})")
if fixture_failures:
    print("FAIL fixture pass — the scanner does not discriminate:")
    for f in fixture_failures:
        print(f"  {f}")
    sys.exit(1)

# ---------------------------------------------------------------------------
# The real scan.
# ---------------------------------------------------------------------------
source = os.environ["CONSULT_SOURCE"]
range_desc = os.environ["CONSULT_RANGE"]
receipts, malformed = scan(source)

for receipt in malformed:
    print("FAIL malformed receipt (want `<repo>@<sha> <file:line…>`): "
          f"consulted: {receipt}")
if malformed:
    sys.exit(1)

pins = [f"{m.group(1)}@{m.group(2)[:7]}"
        for m in (PIN.match(r) for r in receipts) if m]

# The report. Zero is stated, never silent.
print(f"fixture pass: {len(FIXTURES)}/{len(FIXTURES)} discrimination cases "
      "(mention-in-fence excluded; malformed-outside-fence still fails)")
distinct = sorted(set(pins))
print(f"consultations this branch: {len(receipts)} "
      f"(receipt-verified, over {range_desc})")
if distinct:
    print(f"distinct pins: {', '.join(distinct)}")
else:
    print("distinct pins: none — no consultation receipt on this branch")
EOF
