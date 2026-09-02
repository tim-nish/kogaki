---
id: reg-0214
status: pending
observed_at_pr: 777
observed_at_head: a0d3c86
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #777 round 2 — `checks/check-brief-compose.sh`'s own printed scope
line still ends case (m) with *"a count that failed when it moved would go red
exactly when **the re-extraction is performed**"* — the re-extraction v24
withdrew.

**Third surface, same class, one layer down.** Round 1 found the registry's
admission record describing the retired design while the member asserted the
opposite. That was repaired at the same commit, and the runtime's disclosed line
now reads *"when a record is authored or retired"*. The **printed scope line** is
the one surface of the three still naming withdrawn work.

**The class is the finding, not the line.** A check amended by a REVERSAL
carries at least three descriptions of itself — its printed scope line, its
admission record, and whatever the runtime discloses at execution — and they are
updated by different acts with nothing comparing them. `check-registry-conformance.sh`
asserts only that `contract` is non-empty, so no mechanism can see any of these
disagree. A reversal is exactly the amendment most likely to leave residue,
because it does not merely add to what a surface said — it makes the old text
FALSE while leaving it grammatical.

**Not fixed at the head that produced it.** The two-round bound was spent and the
round-2 report certified `a0d3c86`, which the Review presence condition requires
— `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`.

Eighth instance in the 2026-09-02 sitting of that composition; see reg-0206 to
reg-0213.
