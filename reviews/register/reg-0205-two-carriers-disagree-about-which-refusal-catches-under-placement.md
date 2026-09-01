---
id: reg-0205
status: pending
observed_at_pr: 758
observed_at_head: 0166384
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #758 round 2 — the carrier and the enforcement site disagree about
which refusal catches an under-placed member, in the same head that repaired
both.

`specs/spec-terrain/report-format.json`'s `carried_instead` for
`subgroup_members_sum_to_parent` says that refusal fires "on DOUBLE placement …
AND, since kogaki#738, on UNDER-placement". `terrain/terrain.mjs`'s comment at
the refusal says the opposite half: under-placement "is now refused one function
earlier, by SUBDIVISION_COVER_INCOMPLETE … so this refusal never sees it".

**The runtime is right and the carrier is stale.** `SUBDIVISION_COVER_INCOMPLETE`
is raised inside `subgroupPlacement`, which is called one statement before the
sum check, so an under-placed classification never reaches the sum refusal at
all. Both sentences were written in this chain — the carrier's in the first
head, the runtime's in the third — and each was correct about the state of the
tree when it was written.

**Nothing breaks:** both directions ARE caught, by one refusal each, so the
property the carrier claims holds even though its attribution is wrong. What is
wrong is that a reader repairing either refusal meets two accounts of which one
does what.

**Why this is here rather than on an issue.** It is one sentence, and the
sitting that next edits either refusal will meet it. Recorded rather than
fixed at the bound because #758 was at its second round: the two-round bound
binds a submission, and a third head to correct an attribution is exactly the
cost the bound exists to refuse. **Reachability: NOT reachable** — no input
produces a wrong outcome; the defect is legible only to a reader.
