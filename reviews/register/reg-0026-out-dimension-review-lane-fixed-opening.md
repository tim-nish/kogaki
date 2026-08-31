---
id: reg-0026
status: pending
observed_at_pr: 331
observed_at_head: bc73ef7
class: out-of-dimension
recorded: 2026-08-09
source_comment: 5231824423
---
out-of-dimension: the review lane's fixed opening move — an unscoped tier-1 `gloss_index` survey — is unrunnable as specified from inside a review session. At `product-lab@4cc496b` the unscoped call returns 76,961 characters on a single line, which exceeds the harness tool-output limit; the result is spilled to a file whose only offered remedy is character-range slicing, and `.claude/skills/review-lane/SKILL.md` puts ad-hoc byte slicing of a large transcript out of scope for a per-PR review. So the opening move currently costs either a truncated survey or the exact spend the skill refuses.

Observed on PR #331 (head `bc73ef7`), review round 1. Recorded as lane-instrument work rather than PR work, per the *What a review reads* clause: a reviewer that finds itself needing a parser has found a gap in the sweep's own instruments.

No widening is claimed — this is one observation, and the trigger fires at three of a class.
