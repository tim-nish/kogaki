<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A judgment layer had a reader and no producing occasion, so it was wired: a state to emit the material and a second to validate the judgment, both reachable through the executor. Driven end to end, the run recorded both states as completed and the judgment as accepted — and the rendered output still said the judgment layer had not run. The wiring was correct at every link. The cause sat upstream: the renderer caches by an identity computed from a fixed set of inputs, and that identity was defined before the judgment layer existed, so it does not include the judgment record. A run that had earlier produced an unjudged rendering of the same set had recorded that identity, and the judged run matched it, took the idempotent-rerun branch, and re-emitted the stored artifact without ever reading the judgments. Pointing the run at a fresh record directory produced the judged output immediately.

## The learning

An idempotency key is a claim that two requests are the same request, and it silently becomes false whenever a new input is added to the operation it guards. The key was correct when written — it named every input that could change the output — and adding a capability with its own input falsifies it without touching it. That is the failure's whole character: nothing edits the key, nothing contradicts it, and it goes on matching requests that are no longer the same. The result is worse than a stale cache, because the system reports success at every observable point: the new input validates, the record lists it, the operation completes, and the artifact is the old one. There is no error to see and no log line that differs. What makes this a recurring shape rather than one bug is that caches are usually built early, when the input set is small and stable, and capabilities are added later by people reading the capability's own code path rather than the cache's key. So the diagnostic worth carrying is procedural: when adding an input to a cached or deduplicated operation, find what decides that two invocations are equal, and check whether the new input is part of it — before testing, because a first-ever invocation always misses the cache and passes. That is the trap: the natural test is a fresh run, and a fresh run is exactly the case the defect does not touch. The defect appears only on the SECOND invocation, which is the one nobody writes a test for. And the repair is genuinely a decision rather than an obvious fix — widening a ratified identity changes what every existing holder of one believes about it — so the right move on finding it may well be to disclose it, assert the bound where a test would otherwise be order-dependent, and route the widening to whoever owns the key. Recording the bound in the test that depends on it is what keeps the next person from reading that test's setup as arbitrary hygiene.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
