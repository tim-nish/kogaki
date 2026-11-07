<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#977: an exemption in the licence gate was keyed on a commit's changed paths, and the rationale beside it argued only the writing of an emission — but the path list carried no status, so the exemption also covered deleting every file the argument was about protecting.

## The learning

A rule's written rationale has a scope, and the input its predicate reads has a scope, and nothing keeps the two equal. Here the argument was directional — writing this artifact is a by-product and needs no licence — while the input (a bare path list) could express only membership, so the predicate silently granted the opposite direction the argument never reached. The tell is a rationale whose sentences contain a verb the input cannot represent: 'an emission is a by-product of the sitting' is about an act, and a list of paths records no act. So when writing an exemption, read its rationale looking for the verbs, and check that each one is a distinction the input can actually make; where it cannot, either widen the input or say in the rule that the narrower reading is deliberate. The same reading applies to the input format itself: once the predicate needs a richer input, admitting the old poorer one alongside it re-opens exactly the blind spot through the caller, so there is one format and an unrecognised line fails closed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
