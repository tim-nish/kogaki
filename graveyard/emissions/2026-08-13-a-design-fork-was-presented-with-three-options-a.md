<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A design fork was presented with three options, and one was priced as costing a new structural precedent — the first time the codebase would do a certain thing. The decision was made on that basis. Reading the code to implement it revealed the precedent already existed twice, with an established house style including a drift detector. The chosen option was strictly cheaper than it had been sold as, so the decision survived; had the pricing pushed the choice the other way, it would have been made on a false premise.

## The learning

A cost of the form THIS WOULD BE THE FIRST TIME WE DO X is a claim about the whole codebase, and it is the one kind of cost that cannot be assessed from the files the change touches. Every other cost in a fork — a subprocess per poll, a second implementation that can diverge, a larger diff — is visible from the diff's own neighbourhood. Novelty is not: the existing instance is by definition somewhere you are not looking, because if you had seen it you would not have called the thing new. So before writing NEW PRECEDENT into a decision, run the grep that would falsify it, and grep for the SHAPE rather than for the name — the existing instance almost certainly calls itself something else. The payoff is larger than avoiding an embarrassment. A precedent that already exists usually arrives with a house style — where the file goes, how it is loaded, what fixture asserts nobody drifted from it — and that style is a specification you would otherwise have had to invent under a decision-maker's time pressure, badly, while believing you were the first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
