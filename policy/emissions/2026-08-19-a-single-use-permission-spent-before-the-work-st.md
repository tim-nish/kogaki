<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A review lane consumes its single-use owner grant BEFORE spawning the reviewer, deliberately, to close a race where two invocations both read the grant as unclaimed and both spawn. On 2026-08-19 a spawned session died on an expired credential after one turn and zero cost. The grant was gone, the two-round bound was spent, and the pull request became unmergeable with nothing wrong in its diff.

## The learning

Claiming a permission before the work is the right shape for the race, and the cost of that shape is that any precondition failure spends the permission on nothing. The repair is not to claim later — that reopens the race the early claim closed. It is to notice that the two outcomes are trivially separable at the end: a session that worked and found nothing carries turns and cost, and a session that never started carries a terminal error, one turn and zero usage. So pair every claim-before-work with a compensating restore keyed on that terminal record. The general form: whenever a scarce resource is committed ahead of the act for concurrency reasons, ask what the record looks like when the act does not happen, and give that record a path back. Where the scarce resource is a human's click, the asymmetry is sharper still, because the retry needs the very thing the failure consumed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
