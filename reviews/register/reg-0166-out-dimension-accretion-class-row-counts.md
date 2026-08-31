---
id: reg-0166
status: pending
observed_at_pr: 607
observed_at_head:
class: out-of-dimension
recorded: 2026-08-21
source_comment: 5373603584
---
out-of-dimension: (accretion-class row — counts toward rule 3's three-of-a-class trigger)

PR #607 (kogaki#603, story 1.87) installs an address form for served units — `gloss_sha=<sha256 of the raw served line>` and `slug=<slug> kind=lesson` — that no member of `checks/registry.json` can resolve, by ruling: the issue refuses in advance any reconciliation or drift-compensation mechanism, and `issue-pins.mjs` passes identity cites through unparsed on purpose. The consequence is that the correctness of 21 identities in `policy/consultation-map.md` rests entirely on the authoring sitting's own resolution pass, and a reviewer cannot check it from inside the lane (no `gloss_sha` field on the served shard renderings, no hashing tool granted). Same carrier-less shape this lane's own empty-findings gate has, one surface over.

Recorded from the review-lane round 1 report at head a6839ec.
