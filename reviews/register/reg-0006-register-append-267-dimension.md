---
id: reg-0006
status: pending
observed_at_pr: 267
observed_at_head:
class:
recorded: 2026-08-08
source_comment: 5224428051
---
## Register append — PR #267 (`review-lane`), dimension 2

**Accretion-class observation: a boundary matched with a receipt present, but
the entry's own prescribed survey not evidenced.**

`policy/consultation-map.md` entry 1 (Check/CI infrastructure) prescribes
*survey before acting:* `gloss_index("lessons/claude-code-ops")` **and**
`gloss_index("lessons/testing")`, both shards, before the check is written. PR
#267 carries a receipt for entry 1's question (`request_id
23a19853-06d3-42b8-b5a2-87a8da663021`, pins
`topics/knowledge-architecture.md:70,86`, `LESSONS.md:32`) and reports one
survey performed — `gloss_index("lessons/knowledge-architecture")`, which is
entry 3's prescription, not entry 1's.

Mitigating, and why this is a count rather than an instance: entry 1's act class
is *admitting, modifying, or retiring a check*, and #267 admits none — it
declines to license one and is matched by `check-boundary-receipts.sh` on the
bare word `check` in changed text. So the prescribed survey's purpose (admission
economics, read before the check is written) has no check to attach to here.

Recorded because the shape recurs: a mechanically-matched boundary draws a
receipt while the entry's read prescription is satisfied by whichever survey the
sitting happened to run for a different entry. The value is the count of that,
not this instance.
