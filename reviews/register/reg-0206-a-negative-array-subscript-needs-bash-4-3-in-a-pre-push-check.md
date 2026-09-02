---
id: reg-0206
status: pending
observed_at_pr: 767
observed_at_head: 911f433
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #767 round 2 — `checks/check-terrain-retired-vocabulary.sh:248`'s
`unset 'ROOTS[-1]'` is the repository's only negative array subscript. The
idiom needs bash 4.3+, and the file runs under `set -euo pipefail`, so on an
older bash the `bad array subscript` return aborts the check rather than
restoring `ROOTS`. Stock macOS ships bash 3.2.

Fail-loud rather than fail-silent, and CI's bash is unaffected — but this is a
pre-push-tier member, so a contributor on stock macOS meets it before CI does.
The portable spelling is `ROOTS=("${ROOTS[@]:0:${#ROOTS[@]}-1}")`.

**Not fixed in the head that introduced it, and the reason is the composition
rather than the cost.** The fix is one line. The two-round bound was spent at
the moment the finding was written, the round-2 report certified `911f433`, and
the Review presence condition merges only a head carrying a present report — so
pushing a one-line fix would have moved the head past its own certification with
no round left to re-certify it, stranding a green PR. The reviewer routed the
finding here rather than to the PR for that reason, and the routing was
followed rather than overridden.

This is the specimen shape `commands/ship-cycle.md` already cites from the hub:
*"local rationality does not compose … the two-round bound, resolve-in-review
for in-diff defects, the successor lane and the never-by-severity carrier rule
were each individually defensible, and their composition produced a
non-terminating chain no clause-level review could see."* Resolve-in-review is
the right default and was applied to all five round-1 findings; it is the
interaction with a spent bound at a certified head that makes it wrong here.
