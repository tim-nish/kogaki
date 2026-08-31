---
id: reg-0030
status: pending
observed_at_pr: 339
observed_at_head: d1e79b7
class: out-of-dimension
recorded: 2026-08-11
source_comment: 5247721537
---
out-of-dimension: PR #339 — the lane's mandated fixed first move (an unscoped tier-1 `gloss_index` survey) is unrunnable as served. With no tag it returned **76,961 characters on a single line**, over the tool-result budget; the harness spilled it to an overflow file whose lines are then too long for `Read`'s offset/limit chunking, and the suggested repair (byte-slicing with `python3`/`cut`) is a denied shape for this lane. The opening move therefore degraded to *attempted, unreadable*, and the review was composed from the repository and CI alone.

Class: **instrument gap, mechanical** — a lane-wide property, not a property of PR #339, so it is recorded once here rather than re-probed each round. It is the same shape kogaki#65 item 3 (the sweep's denial extractor) was filed under: a reviewer that needs a parser has found a gap in the lane's own instruments. The remedy is on the tool side — a bounded or paged tier-1 survey — not in any per-PR turn.

Recorded under rule 1 by the review-lane report on PR #339 (head `d1e79b7`), which carries the same line and a `cannot-determine: tier-1 gloss survey` for the dimension it cost.
