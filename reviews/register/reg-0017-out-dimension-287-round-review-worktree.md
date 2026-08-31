---
id: reg-0017
status: pending
observed_at_pr: 287
observed_at_head: d94c1ce
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5225203219
---
out-of-dimension: PR #287 round 2 — the review worktree for this spawn was detached at `c2f4e1f`, one commit behind the PR head `d94c1ce` the report must name and review. Reviewing the head required reading it out of the object store (`git diff <base> <head>`, `git show <head>:<path>`) rather than the checkout. A reviewer that trusted its own working tree would have reviewed one commit and reported another, and nothing in the lane makes that visible: `git cat-file -e <head>` succeeds either way, because the object is present even when the checkout is behind. Class: lane infrastructure (the spawn's worktree resolution), not a property of the PR under review.
