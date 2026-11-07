<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

Fixing a judge prompt that described its required record shape in prose, the obvious repair was to write the literal shape out in the workflow table beside the prose sentence. That would have put a third hand-written copy of the shape next to the prose and the validator -- and the prose copy was already the thing that had drifted. The example is instead COMPOSED at prompt time from the very input the judge is judging over: the pin object as that run actually holds it, keyed by the group names that run actually composed.

## The learning

When a producer must be shown an exact shape, a hand-written example is another copy that can drift from the validator exactly as the prose did -- it is the same defect in a more convincing format, and it is worse than the prose because a reader trusts a concrete example more. Derive the example from the real input at the moment of asking instead. Two properties come free that a literal cannot have: it cannot name material the run never composed, and it cannot go stale, because there is no stored second copy to fall behind. The general test for any 'add an example' repair is whether the example is a RENDERING of the authority or a COPY of it; only the rendering is safe to add beside the thing that already drifted.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
