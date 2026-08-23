<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#518 removed a command-line flag from a runtime, which broke a second check that was not on the issue's licensed-artifact list. The flag was kept as a caller affordance instead, so no unlicensed file was touched.

## The learning

When a change to a shared program removes one of its options, the cost lands on everything that already calls it — including test files nobody listed as part of the job. If the permission for the work names a fixed set of files, that set silently forbids the follow-up edits the change forces, and the choice narrows to two: edit a file you were not allowed to, or leave a broken test. There is usually a third way out: keep the removed option working for callers while making sure nothing a person interacts with can reach it any more. What the change was actually asked to remove was the question put to the person, not the switch a script passes. Deciding which of those two the requirement names, before deleting anything, is what keeps the blast radius inside the permission you were given.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
