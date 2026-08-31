---
id: reg-0018
status: pending
observed_at_pr: 296
observed_at_head:
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5225912814
---
out-of-dimension: the lane's fixed opening move — an unscoped tier-1 `gloss_index` survey — returns ~73 KB on a single line, over a single read's budget. The harness spills it to a tool-result file whose lines are too long for `Read`'s offset/limit chunking, so the only way to consult it is bounded pattern queries with `-o` against the spill. The survey therefore runs but is never read whole, and "where to look is an output of the survey" degrades to "where to look is whatever you thought to grep for" — which is the scoped-query failure the opening move exists to avoid. Recorded as an instrument gap in the lane's own opening move rather than re-derived per review. From PR #296.
