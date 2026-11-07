<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A mutation test on a template's blindness property was pasted into the template's own HTML comment, which the renderer strips before writing the file — so the mutation changed nothing, the suite stayed green, and the first reading was that the blindness case did not bind.

## The learning

When you mutate something to check that a test catches it, the mutation has to land in the artifact the test reads, not merely in the file you edited. A file that is transformed on its way to being used — a template whose comments are stripped, a config whose defaults are layered in, a source that is compiled — has regions that never reach the consumer, and an edit there is silently discarded. A green suite then reads as a test that does not bind, which is the opposite of what happened, and the natural next move is to weaken or rewrite a test that was fine. Before concluding a mutation went uncaught, confirm the mutated text is present in what the consumer actually receives.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
