---
id: reg-0004
status: pending
observed_at_pr: 259
observed_at_head: bb17278
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5224051621
---
out-of-dimension: PR #259 — a fix commit authored **after** its PR merges is invisible to every gate: no CI run, no licence assertion, no review segment, and `gh pr view` keeps returning the merged head, so the PR reads converged while the defect sits on a dead branch. Observed twice in one sitting (#247 → #255 → #259); both were caught only because the review lane was re-run manually. The PR body states that nothing in the repo observes this class. Class: **post-merge fix stranding** — mechanical if it recurs (it wants a check or a sweep state, not a judgment input). Recorded from the review-lane sitting on PR #259, head `bb17278`.
