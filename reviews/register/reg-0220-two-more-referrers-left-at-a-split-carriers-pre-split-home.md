---
id: reg-0220
status: pending
observed_at_pr: 781
observed_at_head: ce4367c
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #781 round 2 — `src/brief.mjs:311` and `:321` still cite
**SPEC-style-contract §4** as the ground for plain register, and `:311`
additionally **restates the operational definition inline**: *"(no unexplained
term of art, one relation per sentence, a concrete subject acting)"*.

That is the same second-carrier shape §4's own correction removed from the
design record **in this very round** — the restatement was struck from the
record and left standing in a comment two files away.

**Fourth and fifth referrers of the split carrier**, after the two PR #780
round 2 carried and the one this PR repointed. **Pre-existing rather than
introduced**: `src/brief.mjs` is untouched by this PR, and the citations still
resolve, since §4 keeps its pinned quote.

**The count is the finding.** A carrier that splits produces referrers in
proportion to how useful it was, and they surface one review round at a time
because each round only sweeps the files its own diff touched. Five now, found
across three PRs, none of them by the act that performed the split. The sweep
that would have found all five at once is a grep for the OLD carrier's name
across the whole tree at the moment of splitting — the same root-set lesson
reg-0216 records, arriving on a split rather than on a deletion.

**Not fixed at the head that produced it.** The bound was spent and the round-2
report certified `ce4367c` — `consulted:
product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`. It rides the register rather than kogaki#752,
which stays open only for the spec re-cut and would file this under a heading it
does not belong to.

Fourteenth instance in this sitting of that composition; see reg-0206 to
reg-0219.
