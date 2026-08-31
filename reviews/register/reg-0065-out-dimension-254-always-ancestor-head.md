---
id: reg-0065
status: pending
observed_at_pr: 254
observed_at_head:
class: out-of-dimension
recorded: 2026-08-13
source_comment: 5279150200
---
out-of-dimension: PR #254 — `baseRefOid` is not always an ancestor of the head, and the report's instruments do not say which diff they mean. MIGRATED from kogaki#13 (originally appended 2026-08-08T01:51:06Z, 3m30s after PR #249 moved this lane's register pointer from #13 to #246 — a review session in flight during the move, so it landed on the old carrier and this register's reader never saw it).

On PR #254 `baseRefOid` was `7b23d32`, three commits PAST the branch's merge-base (`283fc73`) because master advanced after the fork. A two-dot diff from the recorded base reports 1008 deletions across `specs/SPEC.md`, `policy/consultation-map.md`, `docs/stories/` and `tools/review-sweep.sh` that the branch never made — master-side commits the branch has not seen. Read naively that is a large unlicensed-scope violation on a diff that actually touches three files, and the PR body's own scope claim reads as false when it is true.

§4 clause 7 mandates writing `baseRefOid` into `review-base:` while the reviewable diff is the merge-base one. If the merge check recomputes with two dots rather than three, a PR that was never rebased but whose base ref drifted fails toward `stale` for a reason invisible from the report. The observation is about the instruments (the clause-7 contract and the sweep's recompute), not about PR #254's content. Class: report-instrument/base-resolution.

Migration note: this is the only append that reached #13 after the pointer moved; #246 has taken all 64 since. The straggler is evidence that a pointer move has no barrier — a session already running holds the old target — which is a different gap from the one kogaki#191 closed (that one was appends to a CLOSED carrier; this one is appends to a LIVE but superseded carrier, which `register-append` does not refuse and arguably should not).
