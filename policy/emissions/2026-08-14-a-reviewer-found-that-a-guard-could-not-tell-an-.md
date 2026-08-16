<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A reviewer found that a guard could not tell an error from an empty result -- both produced the same silent output, so the guard passed when it should have failed. I fixed it: the error now reports itself distinctly. To make the fix checkable I also replaced a nearby fragile test with one that watches actual behaviour. The next review round found that my new test had the identical flaw: it watched a single signal that two completely different failures both produce, so it would announce one when the other had happened. I had reproduced the exact fault I was repairing, inside the repair, one step away from where it started.

## The learning

Fixing a fault where it was found does not stop you from rebuilding it at the site of the fix, and the moment right after understanding a fault is when you are most likely to. The new code is written quickly, in confidence, and reviewed against the old failure rather than on its own terms. So after repairing something, turn the description of the fault on the repair itself and ask whether the new part has the property you just removed elsewhere. Faults of this kind are especially prone to it -- collapsing two different situations into one indistinguishable signal is a shape that recurs wherever a single output has to stand for several outcomes, and a fix often introduces exactly such an output. This is worth separating from ordinary regression: nothing broke, the original repair is sound, and the new instance is latent, which is why nobody would look for it without being told to.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
