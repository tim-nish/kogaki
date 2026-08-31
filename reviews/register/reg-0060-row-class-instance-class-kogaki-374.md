---
id: reg-0060
status: pending
observed_at_pr: 405
observed_at_head: b85827b9146e782eaba2a496e9829f4384cae9ba
class:
recorded: 2026-08-12
source_comment: 5270344976
---
**Row class: instance-class** (kogaki#374) — a spent-bound latent non-gating in-diff carry, NOT an `out-of-dimension:` observation. It must not be counted toward rule 3's three-of-a-class widening trigger, which reads over `out-of-dimension:` rows only.

**From:** PR #405 round 2, head `b85827b9146e782eaba2a496e9829f4384cae9ba` — `finding: should open`, `carried: register`.

**The finding.** In `checks/check-review-report.sh`, the clause-12 fixture block drains and exits on `adj_bad` at lines 1695-1700. The two `adjudication_states()` assertions added by `b85827b` — the three-way-distinction assertion (1726-1728) and the fourth-state assertion (1732-1736) — append to `adj_bad` *after* that drain, and nothing reads `adj_bad` again. Both are therefore unreachable as gates: if the renderer collapsed two states or invented a state for a silently re-graded finding, the check would still exit 0 and would still print "plus the three-way distinction asserted through `adjudication_states()`". `checks/registry.json`'s round-2 `efficacy_note` names those same two mutations among seven "all killed"; those two cannot have been killed by the code as written.

**Remedy:** move the two assertion blocks above line 1695, or repeat the `if adj_bad:` drain after line 1736 and before the `ok:` print.

**Why it lands here rather than on an issue.** The two-round bound was spent at this head, so "resolve it in the review" was unavailable; the defect is latent (the renderer is correct today — what is missing is the protection, plus a present-tense false claim in the printed line and in the admission record); and the reviewing session held no grant that files an issue (`gh issue create` and `story-sync file-issue` are both outside the review lane's grant set), so naming a minted carrier would have named one that does not exist. Reachability, stated so a reader can argue with it: the protection gap fires on any future edit to `adjudication_states()`; the false-claim half is readable today by anyone consulting the registry's mutation table.
