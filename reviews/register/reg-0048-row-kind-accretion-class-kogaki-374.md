---
id: reg-0048
status: pending
observed_at_pr: 389
observed_at_head: 594339b
class:
recorded: 2026-08-12
source_comment: 5263849317
---
**Row kind: accretion-class** (kogaki#374) — the value is the count of receipts landing in this shape, not this instance. This row is NOT an `out-of-dimension:` observation and does not count toward rule 3's three-of-a-class widening trigger; it is a `carried: register` disposition from a non-gating in-diff finding.

From PR #389 review round 1, head `594339b`, finding 3 (`should open`):

The branch's one receipt (`594339b`) carries no v2 continuation lines — no `request_id`, no `outcome`, no `query:` — only two bare `consulted:` pins and prose. `specs/SPEC.md` §4 requires the v2 form of a receipt written now. Two concrete costs rather than a formal one:

- the **miss-harvesting proposer** named in `policy/consultation-map.md` reads the receipt's `outcome` token, and can harvest nothing from a receipt that carries none;
- the **conduct-axis obligation** ratified at kogaki#336 — one query per axis, subject and conduct — is unrecorded and therefore unfalsifiable on the act that composed this spec gate.

`checks/check-consult-receipts.sh` accepts it (it counted 2 over 2 commits, `distinct pins: product-lab@4cc496b`), so nothing was red. The record is simply thinner than the boundary it discharges — entry 3, record disposition, on an amendment whose whole force rests on the record it re-reads.

Appended here rather than minted as an issue because the interesting quantity is how often receipts land in the v1 shape after the v2 grammar shipped. `policy/consultation-map.md` already records that **no emitter writes an `axis:` line** and the key is hand-written, so a count accumulating here is the only signal that the hand-written half is not being written.
