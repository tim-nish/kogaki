---
id: reg-0115
status: pending
observed_at_pr: 502
observed_at_head: f49575bcd891c8f0a1066eecf38d7ff6abed94af
class:
recorded: 2026-08-18
source_comment: 5323077329
---
## Two INSTANCE-CLASS carries from PR #502 (kogaki#374 row kind, not `out-of-dimension:`)

**Row kind declared per kogaki#374:** both rows below are **instance-class** —
their value is the defect each names, not a count. **Neither counts toward rule
3's three-of-a-class widening trigger**, which reads `out-of-dimension:` lines
only. PR #502's report carries no `out-of-dimension:` line.

**Why the register rather than an issue.** Auto-merge was armed on #502
(`autoMergeRequest` non-null, enabled 2026-08-18T03:05:58Z) before the round 1
report landed, so the change lands the moment checks go green and no later round
can read a fix — kogaki#433's second cause, the one the round counter does not
see. The reviewer holds no issue-creation grant, so the register is the floor
carrier available. Reported at
https://github.com/tim-nish/kogaki/pull/502#issuecomment-5323072584 (head
`f49575bcd891c8f0a1066eecf38d7ff6abed94af`).

---

**Row 1 — instance-class. A still-served claim grounded on the shape read.**
`specs/spec-draft-pipeline/SPEC.md` §4.10 and §9.1 (v10) assert that
`topics/articles.md:87` is "still served at this head" and name the ground: the
shape read's "0 of 4 sections differing from the vendored digest". The shape read
is declared awareness-never-substitution and carries no receipt, and the claim is
load-bearing — the whole divergence declaration, and the checkable-proposal
status `topics/knowledge-architecture.md:172` grants it, rest on it. Neither
receipt on that branch reads `:87` at that head. Served position bearing on it,
from the review's tier-1 opening survey: "**establish-the-substrate-before-reporting**
— Before a mechanism reports an absence, a zero, or a default, it owes the reader
proof that the place it looked actually exists and is the place it thinks it
looked." Repair is one re-read of `:87` plus one sentence.

**Row 2 — instance-class. Consultation-map entry 3's survey half unrun on a
record-disposition act.** Entry 3 prescribes `gloss_index("lessons/knowledge-architecture")`
headline-first *and* the carrier read whole. #502 met the carrier half (the owner
ruling is quoted verbatim from kogaki#492's thread) and shows no receipt for the
survey half — `distinct pins: product-lab@8906f20` covers
`topics/knowledge-architecture.md:172`, a different surface from
`gloss/lessons/knowledge-architecture`, which this repository's own §9.1 keeps
apart deliberately. The disposition reached looks substantively right (the
conflict is reported, not reconciled), so this is a missing prescribed read
rather than a wrong reading — recorded because entry 3's origin miss is that
exact spec file.
