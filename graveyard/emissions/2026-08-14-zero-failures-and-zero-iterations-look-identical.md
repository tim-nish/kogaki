<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A guard was changed so that a list it looped over came from reading a file. When the file could not be read the list was empty, so the loop ran zero times and the check it performed silently stopped happening. The output was clean, and clean was exactly what it looked like when the check ran and found nothing wrong.

## The learning

A loop that reports problems tells you nothing when it is silent, because silence is what both success and non-execution produce. So whenever the thing being looped over starts coming from somewhere that can fail or come back empty, the question is no longer whether the check passes but whether it ran at all — and that has to be tested separately, by breaking the thing the loop is supposed to catch and confirming it still complains. The second trap is the fix: when a source of data fails, the instinct is to switch off everything downstream of it. That is right only for the parts that genuinely need the data. Anything that did not depend on it should keep running, or you have quietly replaced a wrong answer with no answer and called it safe. Ask, per assertion, what it actually reads — often less than the code path suggests.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
