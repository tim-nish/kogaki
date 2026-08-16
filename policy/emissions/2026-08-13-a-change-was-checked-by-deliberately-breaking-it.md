<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A change was checked by deliberately breaking it in eighteen small ways and confirming the test suite noticed each one. Three breakages went unnoticed. Investigating them found: one test whose two sample values happened to agree under both the correct ordering and the broken one; one guard for a condition that could never occur, because the code path that would trigger it was structurally unreachable; and one breakage that turned out not to change behaviour at all, so nothing could have noticed it.

## The learning

Deliberately breaking your own work and watching whether the tests complain is worth more than adding tests, because each unnoticed breakage points at something specific rather than at a vague gap. The three kinds it finds are different and want different responses. A sample that agrees under both the right answer and the wrong one is a weak fixture — replace the values with ones where the two answers diverge, which usually means hunting for an edge rather than a typical case. A guard that nothing notices when deleted is often dead: check whether the situation it guards can arise at all, and if it cannot, delete it and test whatever really does catch the failure, because a guard that cannot fire reads as protection and is not. And a breakage that changes no behaviour is a bad probe rather than a missing test, so withdraw it and write a real one instead of adding a test to chase it — otherwise the exercise starts manufacturing tests for distinctions nobody can observe. The breakages worth trying are the ones derived from what the change actually did: delete each thing it added, invert each condition it introduced, widen each restriction it narrowed. Freely invented ones drift toward whatever is easy to imagine.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
