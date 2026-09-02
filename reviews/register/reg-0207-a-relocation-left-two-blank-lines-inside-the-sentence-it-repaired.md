---
id: reg-0207
status: pending
observed_at_pr: 768
observed_at_head: b9ebce4
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #768 round 2 — `checks/check-terrain-composition.sh:3664-3667`. The
round-1 repair moved the §6.0.1 block out of the golden-specimen header comment,
and left two blank uncommented lines where it had been: the sentence still
breaks visually at its verb, between "…CONFORMANT against the grammar, by the
same" and "# predicate the emitters refuse with". Harmless to the shell.
Deleting the two blank lines closes it.

**The residue is the same defect one order of magnitude smaller**, which is what
makes it worth a line rather than a shrug: a repair that relocates a block is
judged by whether the block moved, and the seam it leaves behind is in neither
the before nor the after of the reader's attention.

Not fixed at the head that produced it: the two-round bound was spent, the
round-2 report certified `b9ebce4`, and the Review presence condition merges only
a certified head — see reg-0206, recorded the same day for the same composition.
