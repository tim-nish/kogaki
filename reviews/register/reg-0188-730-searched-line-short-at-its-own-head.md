---
id: reg-0188
status: pending
observed_at_pr: 731
observed_at_head: 9e7d2f2
class: out-of-dimension
recorded: 2026-09-01
source_comment:
---
out-of-dimension: PR #731 — issue #730's `searched:` line counts five tracked
files. The count was short at the head it was written against, because
`reviews/register/` did not exist then: the kogaki#624 migration created the
directory afterwards, and its records are tracked files carrying the
references the line enumerates.

Accretion-class, and the class is the transferable half: **a `searched:`
denominator is a claim about a tree at a head, and it silently decays whenever
a later change adds files to the searched population.** Nothing re-reads a
merged issue's `searched:` line against the tree it now describes, so the
decay is invisible by construction — the line keeps reading as evidence.

No repair is proposed for #730 itself; the count was honest when written, and
rewriting a merged issue's evidence line would substitute a later tree for the
one the finding was actually relative to. What is worth counting is how often
this recurs.

Raised at PR #731 round 1 and declared `carried: register`, alongside
[[reg-0187]]. Both reach the register only now, for the reason kogaki#735
records.
