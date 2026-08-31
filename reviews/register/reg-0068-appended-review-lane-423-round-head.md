---
id: reg-0068
status: pending
observed_at_pr: 423
observed_at_head: 5e11ab4
class:
recorded: 2026-08-13
source_comment: 5279719407
---
Appended by the review lane from **PR #423 round 2** (head `5e11ab4`). Two rows, of the two different kinds this ledger holds — typed here per kogaki#374, because rule 3's three-of-a-class widening trigger reads `out-of-dimension:` rows **only**.

---

**Row 1 — a `carried:` row (spent-bound in-diff carry, kogaki#374). NOT counted toward rule 3.**

`checks/check-boundary-receipts.sh` cites its own constructs by bare line ordinal in its durable comment block, and the ordinals do not survive the block growing.

- PR #423's round-2 fix commit added a sentence citing "`%B` is read only on the live pass (:532, :536)". The same commit inserted 22 lines above those reads, so at the head it landed on they are at **:554 and :558**. The pointer was stale on arrival.
- Three more of the same class predate the PR: :131–134 cite `(:327-330)` for `term_pattern`'s word bound, `(:342)` for `match_boundaries`' `break`, and `(:454-456)` for the source order. All three are stale at `5100c9a` as well, pointing at scratch-fixture code rather than the constructs named.

Four instances in one file. Remedy where anyone touches it: cite the construct (`term_pattern`, `match_boundaries`, `git log --format='%B'`) rather than the ordinal, which does not decay.

Disposed to the register rather than to an issue because PR #423 is at its two-round bound — "resolve it in the review" has no round left — and a successor PR for a wrong ordinal in a comment costs at least two further review rounds. **Its own internal recurrence is not this ledger's accretion class:** it arrives by `carried:`, so it is an instance row and must not be read as one of rule 3's three.

---

**Row 2 — an `out-of-dimension:` row (accretion-class). Counts toward rule 3.**

*Class: the lane's own seam and tooling instruments, not the PR under review.*

Seam reads for the lane's fixed opening move exceed the harness output limit at **both** tiers, now measured twice:

| read | size | outcome |
|---|---|---|
| unscoped tier-1 `gloss_index` (PR #423 round 1) | 76,961 chars | over limit, unread |
| `topic_thread("knowledge-architecture")` (PR #423 round 2) | 286,380 chars | over limit, spilled to file |

Both spill to a **single-line** file, which `Read`'s offset/limit chunking cannot slice and which this lane's own guidance puts out of scope for a per-PR review to byte-slice.

**The workable shape, recorded so the next reviewer does not rediscover it:** the `Grep` tool over the spilled file is a bounded read and works. Round 2 used `.{0,90}<phrase>.{0,220}` with `-o` to verify a served quotation verbatim out of the 286 KB spill in one turn. What it does **not** recover is the line ordinal — the rendering carries no line markers reachable that way — so a pin's `:N` half stays `cannot-determine` from inside a review.

This is a gap in the sweep's own instruments rather than a task for any one review turn, which is why it is here rather than in a finding.
