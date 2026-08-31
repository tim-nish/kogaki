---
id: reg-0049
status: pending
observed_at_pr: 389
observed_at_head:
class:
recorded: 2026-08-12
source_comment: 5264031077
---
**Receipts are landing without their v2 continuation lines.** PR #389 round 1, `should`, accretion-class. Appended by the merging run because the report dispositioned it `carried: register` while naming no comment, and an undischarged carry evaporates at merge — the failure §4 clause 8 and kogaki#224 name. Report: https://github.com/tim-nish/kogaki/pull/389#issuecomment-5263765449

**The shape.** The branch's receipt (`594339b`) carries two bare `consulted:` pins and prose, and **no `request_id`, no `outcome`, no `query:`** — the v2 continuation lines `specs/SPEC.md` §4 requires of a receipt written now. `checks/check-consult-receipts.sh` accepts it (it counted 2), so nothing goes red; the record is simply thinner than the boundary it discharges.

**Two concrete costs, not a formal one.**

- The **miss-harvesting proposer** named in `policy/consultation-map.md` §"Admission and proposal" reads the `outcome` token to propose a map entry for the occasion that produced it. A receipt carrying no `outcome` is invisible to it, so every consultation landing in this shape is unharvestable by construction — including the ones most worth harvesting, since a receipt is written precisely where a boundary was engaged.
- The **conduct-axis obligation** ratified at kogaki#336 — one query per axis, subject and conduct — is unrecorded and therefore unfalsifiable on the act that composed the #385 spec gate. Whether both axes were asked cannot be established from the record either way.

**Why this is accretion-class and not an instance defect.** The value is the **count** of receipts landing in this shape, not this one. This session alone wrote receipts on five branches (#378, #379, #383, #387, #388, #389) and every one of them is prose-plus-pins with no continuation lines — so the count is already at least six, all by one actor in one sitting, which is exactly the signal a register exists to make visible. A per-receipt repair would fix six records and leave the seventh to be written the same way, because nothing in the authoring path asks for the fields.

**What would retire the row rather than add to it:** the receipt's v2 form emitted by the same act that writes it, so a hand-authored `consulted:` line is not the path of least resistance. Named here rather than proposed — that is a design act with its own carrier, and this row is the measurement it would be argued from.
