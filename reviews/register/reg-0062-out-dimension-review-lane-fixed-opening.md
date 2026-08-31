---
id: reg-0062
status: pending
observed_at_pr: 418
observed_at_head:
class: out-of-dimension
recorded: 2026-08-13
source_comment: 5278554159
---
out-of-dimension: the review lane's fixed opening move — an unscoped tier-1 `gloss_index` survey — returns ~77 KB on a single line. That overflows the tool result and spills to a file whose lines are too long for `Read`'s offset/limit chunking, so the survey is only reachable through a bounded `Grep` over the spill. The opening move the lane mandates is not readable by the instruments the lane grants. Observed on PR #418.

**Row kind: accretion-class** (`out-of-dimension:`, kogaki#374) — its value is the count, not the instance. It counts toward rule 3's three-of-a-class widening trigger; it is not a spent-bound latent carry.
