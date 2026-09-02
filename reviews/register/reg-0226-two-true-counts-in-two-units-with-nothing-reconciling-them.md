---
id: reg-0226
status: pending
observed_at_pr: 786
observed_at_head: f79587e
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #786 round 2 — `specs/SPEC.md` §3.2 opens its line-count paragraph
*"Forty line-numbered pointers into this file survive across the tree"*, while
the pull request body states **27 ranges, verified individually**. Both are
true and they are **different units**, and nothing in the tree says so:

    git grep -c -E "specs/SPEC\.md:[0-9]" -- . | awk -F: '{s+=$2} END{print s}'   # 40 occurrences
    git grep -oh -E "specs/SPEC\.md:[0-9]+(-[0-9]+)?" | sort -u | wc -l           # 27 distinct ranges

**"Forty" is the one count in §3.2 carrying neither a command nor an
enumeration beside it** — three screens above that section's own rule that a
count with an enumeration beside it is re-derived, and that an edit to the
number is a claim about membership only the enumeration can answer.

**The reviewer raised it as unreconciled rather than as wrong, which is the
right reading**, and the repair is one word plus a command: say *occurrences*
and give the derivation, the way the 40/37 pair in the same section already
does.

**The class is narrower than the neighbouring one and worth separating.**
reg-0225 is a figure that is false. This is two figures that are both true in
units nobody named — the join-key homonym shape, in arithmetic: a reader
holding one number and meeting the other has no way to tell a discrepancy from
a unit change.

**Not fixed at the head that produced it.** The bound was spent at round 2 and
the report certifies `f79587e`.
`consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933 topics/claude-code-ops.md:154`
