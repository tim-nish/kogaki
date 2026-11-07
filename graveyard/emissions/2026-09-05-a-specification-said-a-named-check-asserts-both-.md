<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A specification said a named check 'asserts both stay fit to use' about two lookup tables. One of the two was asserted nowhere at all — its only reader had been deleted in the same change that made the claim load-bearing, leaving an unused import as the sole trace — and the other was asserted for four of its ten entries. The claim was written in the same change that removed the tables' rendering path, and it was the whole argument for keeping the tables at all.

## The learning

When a change removes something's only reader but keeps the thing itself on purpose, the sentence explaining why it is kept is the most dangerous sentence in the change: it is written at the moment the author is most certain, it is what a later reader will rely on to avoid deleting the thing, and it is the least likely part of the change to be checked, because nothing is exercising the kept thing any more. Prefer naming the specific test that carries such a claim, in the claim itself. A claim that names its carrier can be checked by following one pointer; a claim that merely says a guard exists is confirmed by reading the sentence again, which is how it survives being false. The signature is an unused import left behind by the deleted reader — the compiler's own record that something is retained and unexercised — and the giveaway that retention arguments are not self-verifying: the argument for keeping a thing and the evidence it is still fit to use are different artifacts, and only the second can fail.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
