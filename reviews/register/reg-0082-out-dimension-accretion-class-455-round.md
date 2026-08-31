---
id: reg-0082
status: pending
observed_at_pr: 455
observed_at_head:
class: out-of-dimension
recorded: 2026-08-14
source_comment: 5295960630
---
out-of-dimension: [accretion-class] PR #455 round 2 — `tools/review-sweep.sh`'s embedded fixture pass is not a registered check and never runs in CI, so the state-machine block's assertions are protected by nothing mechanical. Round 2 supplies the concrete measurement: the carry-forward case added by this PR asserted NOTHING in its first draft (one stub diff for every range carried every report forward, `decide()` returned `done` before any spent-bound branch, and the mutation it existed to kill changed nothing) and passed either way. It was caught by the author running the mutation by hand, not by any mechanism. A suite whose only defence against a vacuous case is somebody choosing to mutate it is the shape `checks/check-review-report.sh` already names about this file.
