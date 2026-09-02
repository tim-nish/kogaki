---
id: reg-0215
status: pending
observed_at_pr: 777
observed_at_head: a0d3c86
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #777 round 2 — the disclosed exemplar count's read
(`txt.split(/^excerpt:[ \t]*/m)[1]`) **does not stop at the next field**. It
returns the excerpt plus everything after it, so a record whose `excerpt` is
empty but which carries any later field strips only the `>-` header and hands
`isExemplar` the FOLLOWING field's text — counted as an exemplar.

**Inert today, live on the next schema edit.** `excerpt` is the last field in all
22 records and the line is disclosed rather than asserted, so nothing reports
wrongly at this head. It becomes live the first time a field is authored after
`excerpt`.

**The repair for an under-report created an over-report, in one commit.** Round
1's finding was the same read matching only the folded-scalar header, so an
inline record counted as a NON-exemplar. Widening the match to admit both
authored forms fixed that direction and opened the opposite one. The two defects
are the two sides of one predicate, and the fix moved the error across rather
than removing it.

**This is the sitting's own emitted lesson recurring inside the fix for its first
instance** — *a predicate has two sides and a mutation pass tests the one you
were worried about* (emitted earlier today from PR #775's rounds). There the
admitting side had no cases; here the admitting side was OPENED by the repair to
the refusing side, in the same expression, minutes later. A one-sided repair to a
one-sided defect is the shape to look for.

**Not fixed at the head that produced it.** The bound was spent and the round-2
report certified `a0d3c86` — `consulted:
product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933 topics/claude-code-ops.md:154`.

Ninth instance in the 2026-09-02 sitting of that composition; see reg-0206 to
reg-0214.
