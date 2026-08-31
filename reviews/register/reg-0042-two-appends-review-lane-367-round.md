---
id: reg-0042
status: pending
observed_at_pr: 367
observed_at_head: 3c59565
class:
recorded: 2026-08-12
source_comment: 5260834965
---
Two appends from the review lane, PR #367 round 2 (head `3c59565`).

`out-of-dimension:` **the lane's prescribed opening move no longer completes as written.** `.claude/skills/review-lane/SKILL.md` names an unscoped tier-1 `gloss_index` survey as the review's *fixed first move*. On this run it returned 76,961 characters on a single line — over the session's single-tool-result ceiling — and was spooled to a file whose lines are too long for `Read`'s offset/limit chunking. The only route left is ad-hoc byte slicing of a large transcript, which the same skill file puts **out of scope for a per-PR review**. So two clauses of the lane's own instructions now contradict each other on the surface they both describe, and the resolution available to a reviewer is to skip the prescribed move and record a `cannot-determine:`, which is what this round did. A property of the lane, not of the PR — recorded here rather than as a finding. If this recurs, the instrument gap is a scoped or paginated opening survey, not a bigger read budget.

`carried: register` — **a fixture restating a pinned fact as a local literal, with no mismatch check.** PR #367's AC8 disjointness case hardcodes `new Set(["L1","L2","L3"])` as "the survey's own display ids", while that space is minted at `terrain/terrain.mjs:378` and pinned by `specs/spec-terrain/survey-schema.json:34` (`"candidate_display_id_pattern": "^L[0-9]+$"`). Sound today; passes silently the day the pattern widens. Accretion-class: the value is the **count** of fixtures that restate a pinned value locally rather than reading it, not this instance. Filed at the count, per the register's purpose.
