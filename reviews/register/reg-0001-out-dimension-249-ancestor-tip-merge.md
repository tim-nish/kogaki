---
id: reg-0001
status: pending
observed_at_pr: 249
observed_at_head: 03765e53466d576915ba2d19323ea77ef2937c71
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5223831374
---
out-of-dimension: PR #249 — `baseRefOid` is not an ancestor-tip of the PR's merge-base. `gh pr view 249 --json baseRefOid` returns `6034056` (master's tip at read time) while `git merge-base origin/master HEAD` is `a45600f`, one commit behind it. A two-dot `git diff <baseRefOid> HEAD` therefore shows a phantom 301-line *deletion* of `specs/spec-draft-pipeline/SPEC.md` — the reverse of #241, which the branch simply predates — and reports 5 files changed instead of 4. A reviewer that diffs against the recorded base literally reviews a large deletion nobody wrote; the three-dot form is the correct read and nothing in the lane says so.

Class: `recorded-base-vs-merge-base`. Bears on `review-base:`'s own clause in `.claude/skills/review-lane/SKILL.md`, which says the merge check "recomputes both diffs and carries the report forward when they are byte-identical" without stating which of the two diff forms it recomputes — the carry-forward property differs between them exactly when the base has moved ahead of the merge-base, which is the case the clause exists for.

Appended by the review-lane sitting for PR #249 (head `03765e53466d576915ba2d19323ea77ef2937c71`), per rule 1.
