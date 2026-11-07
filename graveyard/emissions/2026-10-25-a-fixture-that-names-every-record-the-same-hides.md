<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

Adding the copy of each Leg Move into the run's Move directory (kogaki#1601): every fixture run stopped on an id clash, because the fake model named the nested run's Move exactly as it named the first paragraph Move, while the real run's Leg Move carried a different name.

## The learning

When a change starts moving records from one store into another, a test fixture that gives every record the same name turns every run into a collision, and the collision says nothing about real use. Before reading a new clash stop as a design problem, check whether the fixture's names are distinct the way real names are; make the fixture name them apart, then keep one case that builds the clash on purpose so the stop is still tested.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
