<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A tool refused to convert an issue into a tracking carrier because the issue already held a classification, and its refusal text said to re-triage it first if the classification was wrong. Re-triage writes a classification — every value in the closed set is one — so the recommended repair returns the issue to the exact state the refusal tests for. No act existed to clear or convert the field. The governing contract listed the blocked act as a reachable terminal state, so the refusal was correct against its own precondition and wrong about the system.

## The learning

A refusal that suggests a repair makes a claim about the system beyond the one it was written to make: that a path exists from the refused state to the permitted one. That claim is not tested by anything. The precondition is exercised constantly and its correctness is well established; the suggestion is exercised only by whoever hits the refusal, and their finding is that it does not work — which arrives as a support question rather than as a failing test.

The asymmetry is what makes it durable. A refusal's condition is code and lives beside the state it reads; its remedy sentence is prose and refers to acts elsewhere, often in another command or another repository. Those acts change on their own schedule, and nothing joins them back. So the sentence stays literally readable and quietly false — and it is trusted more than ordinary documentation, because it appears at the moment of failure and is authored by the thing enforcing the rule.

Two consequences worth acting on. Where a refusal names a repair, the repair is an ASSERTION about a reachable path and owes a test that walks it — refuse, apply the named remedy, retry, expect success — which is cheap because both ends already exist. And where the named remedy is an act in another component, prefer naming the PROPERTY the state must reach over naming the act that reaches it: a property stays true when the act is renamed, and a reader who cannot find the act at least knows what they are looking for.

The sharpest form is when the contract lists the blocked act as reachable while no act reaches it. Then the refusal is correct, the contract is correct, and the gap exists only in the join between them — which is exactly the place no single artifact's tests are looking.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
