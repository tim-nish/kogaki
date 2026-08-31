---
id: reg-0088
status: pending
observed_at_pr: 460
observed_at_head:
class:
recorded: 2026-08-14
source_comment: 5296616919
---
Two rows from PR #460 round 2 (merged `7e4e504`), dispositioned `carried: register` by the round.

out-of-dimension: [accretion-class] PR #460 round 2 — the precedence declaration is written on only one side of the disagreement. §14.4.1 amends §12.2 (v12)'s owner-rendering count by name and declares precedence per artifact, quoting *"Write down which side wins when the two disagree, **in a place both sets of maintainers will read**"*. The declaration lives at §14.4.1 and nowhere else: §12.2 (v12) still reads *"The working tree holds exactly one owner rendering"* with no forward pointer, ~950 lines away, and a reader asking how many renderings the tree may hold lands there. This file's own convention for amending §12.2 is a new versioned section beside it (v11 → v12); this amendment is not. The quoted lesson's qualifier is the undischarged half.

out-of-dimension: [accretion-class] PR #460 round 2 — an enumeration whose whole argument is about not over-claiming coverage miscounts itself. §14.4.1's *"What is NOT carried"* paragraph announces *"Three things, and the third is the one a reader would otherwise assume"* and then appends a fourth, unrelated item after the third bullet's own concluding sentence (*"Nothing counts the rendering files either"*) — an item about §12.2's count rather than about the hand-over floor the bullet is for.

**Both are carried to kogaki#462 as well, and that is deliberate rather than double-filing.** The register holds them as instances for the count; #462 holds them as *work*, because they are one repair with round 2's finding 7 — amend at the site the reader arrives at, not only at the site that knows. Finding 7 itself was filed rather than registered: it names two specific clauses and a consumer that reaches one of them next (story 1.66), which is `blocks:`-shaped rather than accretion. That disagrees with the round's disposition on the **carrier** axis and not on severity, and it is recorded here so the disagreement is visible rather than silent.
