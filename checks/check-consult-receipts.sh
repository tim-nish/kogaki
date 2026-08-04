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

source = os.environ["CONSULT_SOURCE"]
range_desc = os.environ["CONSULT_RANGE"]

# A receipt: `consulted: <repo>@<sha> <file:line[,line][, file:line…]>`
RECEIPT = re.compile(r'^\s*consulted:\s*(.+)$', re.MULTILINE)
PIN = re.compile(r'^(\S+)@([0-9a-f]{7,40})\s+(\S.*)$')

receipts = [m.group(1).strip() for m in RECEIPT.finditer(source)]

malformed = []
pins = []
for receipt in receipts:
    match = PIN.match(receipt)
    if match:
        pins.append(f"{match.group(1)}@{match.group(2)[:7]}")
    else:
        malformed.append(receipt)

for receipt in malformed:
    print("FAIL malformed receipt (want `<repo>@<sha> <file:line…>`): "
          f"consulted: {receipt}")
if malformed:
    sys.exit(1)

# The report. Zero is stated, never silent.
distinct = sorted(set(pins))
print(f"consultations this branch: {len(receipts)} "
      f"(receipt-verified, over {range_desc})")
if distinct:
    print(f"distinct pins: {', '.join(distinct)}")
else:
    print("distinct pins: none — no consultation receipt on this branch")
EOF
