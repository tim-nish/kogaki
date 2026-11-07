<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A reviewer reported a call that omitted an argument, grading it low severity because an unrelated invariant upstream made the omission unreachable in practice. The repair supplied the argument and, in doing so, called the function with the wrong number of parameters — turning a masked, harmless defect into an unconditional crash on the exact path the change existed to add. The next review round re-graded the same call site from low to blocking, on the ground that the harm class had changed. Nothing caught it in between because the tests exercised the function that RETURNS the state and never the branch that RENDERS it.

## The learning

A finding graded low because something else masks it is the most dangerous kind to repair, and the danger is in the repair rather than in the defect. The mask is what kept the code path cold, so the repair is being made at a site with no live coverage, and the grading that made it feel safe to touch is precisely what predicts nothing will notice if the touch is wrong. Two consequences worth acting on. When you fix a masked finding, treat the fix as changing a hot path even though the report called it cold, because your change is what warms it. And when a review reports BOTH a defect and the absence of an assertion over that defect's site, fix them in the same act — the assertion is not the follow-up work, it is the only thing that distinguishes a repair from a coin flip. The failure signature to recognize is a severity RISING across rounds at an unchanged call site: that is not a reviewer being inconsistent, it is the repair having changed the harm class, and it should be read as evidence about the repair rather than about the grader.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
