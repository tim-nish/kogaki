---
id: reg-0005
status: pending
observed_at_pr: 259
observed_at_head: 4e28634
class:
recorded: 2026-08-08
source_comment: 5224102694
---
From the review lane, PR #259 round 2 (head `4e28634`).

out-of-dimension: head `bb17278` carried **two** `review-lane report:` segments — 02:20:10 and 02:26:01, from two separate spawns, with a "spawn produced no report" notice posted between them. CI's own review-report line at the next head reads the duplication back verbatim: *"it names bb17278, bb17278 and this head is 4e28634"*. This is the round-count inflation shape the lane warns reviewers against, but it did **not** come from a reviewer retry — both segments are complete, well-formed reports from independent spawns. Rounds are counted from segments, so a PR whose author answered every finding can be pushed to `park` by the sweep's own spawn behaviour. No per-PR act can prevent it, which is what makes it different-unit business rather than a finding.

carried here under §4 clause 8's `carried: register`: §6.9.0's exercise table in `specs/spec-draft-pipeline/SPEC.md` states a listing criterion — *"a case is listed only where it was first observed to fail against the previous text and then to pass against this one"* — that its own rows no longer meet. Four rows now diverge from it: two attribution-only rows raised at #259 round 1, a third added by the round-2 fix (`- bullet` after a `>-` scalar — refused before, refused after, attribution moved), and a fourth, the stated residue, which inverts the criterion outright by recording an **admitted** case listed precisely because it does not pass. Accretion-class: the value is the count, not the instance — one row per PR, and no single PR's diff is the place to repair the criterion.
