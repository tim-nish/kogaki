<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A check was written with a deliberate-breakage test: take the working code, break one thing, confirm the test notices. Reviewers pointed out the broken versions were not the real code at all — someone had hand-written small imitations of it and broken those instead, which only shows that an imitation behaves like an imitation. It was corrected. The correction added two more broken versions, and both were hand-written imitations again. A summary line then went out stating that all four were made from the real code.

## The learning

When you prove a test works by breaking the thing it checks, the broken version must be the real code with something altered — not a small stand-in written alongside it that behaves the way you expect the broken code to behave. A stand-in proves only that the stand-in behaves as written, and it does so convincingly, because you wrote both it and the expectation. Two tells that it has happened: the broken version contains its own copy of the wording or values the test looks for, so the test could pass with the real code deleted; and the broken version never actually calls the real code. Expect this to recur immediately after it is pointed out — the natural way to add a broken version is to write one, which is the defect — so when correcting it, check the correction the same way, and never let a summary claim the property before every member has it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
