<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

Two assertions written in the same sitting could not fail, and both were found by deliberately breaking the code to see whether they fired. One was placed in a test case whose inputs are degraded by design, so the condition it looked for could never appear there; the other covered a field built entirely from constants, so it had nothing variable to catch.

## The learning

An assertion is only as good as the inputs of the case it sits in, and the two are chosen at different moments — you write the assertion thinking about the defect and place it thinking about convenience. Where a suite has several cases with deliberately different inputs (one degraded, one fully populated, one adversarial), the wrong placement produces a test that reads as coverage and can never fire. The cheap discipline that finds this is breaking the code on purpose once per new assertion and confirming it fails; the cheap discipline that prevents it is asking, for each assertion, which case actually supplies the input this condition needs. And when you move a survivor to the right case, say in the file that you moved it, because a relocated assertion and one that was always there look identical afterwards.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
