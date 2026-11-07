<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-28
repo: Kogaki
grain: lesson

## Trigger — what happened

specs/SPEC.md §4 declared a deferred slot for the axis: value set and, in the same clause, fixed its own reopen condition: 'the reopen trigger is the hub ratifying it.' The hub ratified the set on 2026-08-13 and restated the consumer's enforcement duty on 2026-08-25. Fifteen days later nothing had fired. The writer (policy/kit/bin/consult.mjs) had meanwhile been given the ratified set and refuses an out-of-set token; the check (checks/check-consult-receipts.sh) stayed shape-only, with its own test asserting that behaviour as intended. The two carriers of one rule disagreed in the tree and no run noticed. It surfaced only because an unrelated pair of issues added two more keys to the same grammar block and a sitting had to read the clause to place them.

## The learning

A reopen trigger is a promise that some future event will be noticed. Written as prose inside the artifact it governs, it has no reader: the artifact is opened when someone is changing it, and the triggering event happens somewhere else entirely — in another repository, on another day, to another team. So the trigger's own firing condition is invisible at exactly the moment it becomes true, and the clause keeps reading as live and disciplined for as long as nobody opens the file. This is worse than an unwritten rule, because the written trigger discharges the author's felt obligation and produces a durable artifact attesting that the case was handled. The failure is silent twice: nothing fires, and nothing records that nothing fired. Two properties make it durable. The trigger's condition is stated in the vocabulary of the OTHER side (here, 'the hub ratifying it'), so no local act can evaluate it without reaching across a boundary that the deferral existed precisely to avoid reaching across. And the interim state is designed to look correct — the clause names the cost it is accepting ('the price of not minting'), so a reader who finds the accepted cost still being paid reads a working trade rather than an expired one. The tell that separates the two is not in the artifact at all: it is a DIVERGENCE between carriers that were meant to agree, which is observable mechanically and was, in this case, sitting in the tree unlooked-at. So the remedy is not a better-worded trigger. Where a deferral will be discharged by an event on the other side of a boundary, the honest carrier is an issue — something that appears in a queue somebody sweeps — and the artifact's clause becomes a pointer to it rather than the record of it. Where that is too heavy, the second-best is to make the DIVERGENCE the observable rather than the event: a check that asserts the two carriers agree fails the day the ratification lands, which converts an unobservable external event into a local failing test.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
