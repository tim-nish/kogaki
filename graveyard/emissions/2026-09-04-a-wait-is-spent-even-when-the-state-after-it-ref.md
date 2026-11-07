<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

At terrain's ID_SELECTION wait I answered 'G1-3' without re-passing --claims and --subdivisions on that invocation. The SubGroup ids did not resolve — the refusal listed only G1..G11 — but the run record had already recorded the wait as answered, so the obvious retry ('same input, this time with the files') was refused with 'no wait is outstanding'. The recovery was to re-invoke with the composed inputs and no --input at all.

## The learning

When a stop-and-resume runtime records that an owner answered, and the work that consumes the answer runs afterwards, a failure in that work does not put the question back. The two events look like one act from the outside — you typed an answer and got an error — so the natural next move is to answer again, and that move is refused as though nothing had happened. Two things follow. For whoever builds such a runtime: if the state after a wait can refuse for a reason the answer did not cause, say so in the refusal — name that the answer is recorded and that resumption is a plain continue, because the operator cannot see which side of the boundary the failure fell on. For whoever drives one: a refusal arriving right after an answer is not evidence the answer was rejected, and re-supplying it can be the one move the runtime will not accept.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
