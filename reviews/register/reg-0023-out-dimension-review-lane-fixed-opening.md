---
id: reg-0023
status: pending
observed_at_pr: 330
observed_at_head: 3945dbf
class: out-of-dimension
recorded: 2026-08-09
source_comment: 5231347837
---
out-of-dimension: the review lane's **fixed opening move is structurally unavailable** at the current hub state. `.claude/skills/review-lane/SKILL.md` prescribes "an unscoped tier-1 `gloss_index` survey" as the review's first act. The unscoped call returns **76,917 characters on one line** and is refused by the harness's tool-result token limit before any headline reaches the reviewer; the payload is spilled to a file whose lines are too long for `Read`'s offset/limit chunking, and slicing it is out of scope by this SKILL's own rule ("ad-hoc byte slicing of a large transcript … is out of scope for a per-PR review").

Observed on **PR #330** (head `3945dbf`), reported there as a `cannot-determine:` line. This is not a property of that PR: it is a property of the lane against a tier-1 index that has grown past the result limit, so **every** sitting of this lane hits it until either the index shrinks or the lane gets a bounded way to read it. Recorded here rather than re-discovered per round, per this SKILL's "a probe of the lane's own sandbox is register work" clause.

The instrument shape this suggests, named without proposing it as the answer: a paged or headline-only tier-1 read, so the prescribed opening move has a form that fits the reviewer's result budget.
