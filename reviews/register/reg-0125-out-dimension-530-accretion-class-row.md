---
id: reg-0125
status: pending
observed_at_pr: 530
observed_at_head:
class: out-of-dimension
recorded: 2026-08-19
source_comment: 5337848043
---
out-of-dimension: PR #530 — accretion-class row.

The lane's prescribed fixed first move, an unscoped tier-1 `gloss_index` survey, is unusable as specified from a review session. The call succeeds, but the result is ~76,961 characters on a SINGLE line, which exceeds the tool-result ceiling; the harness saves it to a transcript file and suggests byte-slicing it back in chunks. That fallback is precisely the ad-hoc slicing `.claude/skills/review-lane/SKILL.md` declares out of scope for a per-PR review ("Improvised byte arithmetic re-derives once per round something that belongs once in the tool").

So the opening move is presently either skipped or paid for at several turns of slicing, and the SKILL prescribes it unconditionally. Recorded as an instrument gap rather than acted on: a bounded or paginated tier-1 survey belongs in the seam or in the sweep, not in each round.

Round 1 of PR #530 covered both dimensions without it.
