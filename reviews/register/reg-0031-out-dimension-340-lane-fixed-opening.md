---
id: reg-0031
status: pending
observed_at_pr: 340
observed_at_head:
class: out-of-dimension
recorded: 2026-08-11
source_comment: 5248072061
---
out-of-dimension: PR #340 — the lane's fixed opening move is unusable from a review session as shipped. An unscoped tier-1 `gloss_index()` returned 76,961 characters on a **single line**, which exceeds a single read; the harness saved it to a file, and reading it back would need either ad-hoc byte slicing of a large transcript or a line-oriented tool over a one-line payload — both of which this lane rules out for a per-PR review (`.claude/skills/review-lane/SKILL.md`, *Read tool output through bounded, purpose-shaped commands*). So the survey ran, the seam was reachable, and the review still had to record `cannot-determine` on it.

Class: **lane instrument gap** — a required opening act with no bounded reader. Same class as the denial extractor kogaki#65 item 3 gave the sweep. Recorded here rather than solved in a review turn; the plausible instruments are a paginated or tag-scoped survey wrapper, or the seam emitting the tier-1 index one headline per line.

Reported at PR #340 round 1: https://github.com/tim-nish/kogaki/pull/340#issuecomment-5248070765
