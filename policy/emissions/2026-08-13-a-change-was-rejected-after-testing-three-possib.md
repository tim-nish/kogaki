<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A change was rejected after testing three possible fixes. The reasoning for rejecting the last one was sound and the conclusion was right. But one piece of evidence cited alongside it — that an existing test suite still passed with the change applied — turned out to be incapable of failing: the suite exercised the code by a path that never touched the part the change altered.

## The learning

A conclusion can be correct and still rest partly on evidence that could not have come out any other way, and that is worth catching even when the answer does not move. The tell is asking, of each piece of evidence: what would this have looked like if the thing I am claiming were false? If the answer is the same, the evidence is decoration and the real weight is carried by something else — which should be said, so a later reader does not lean on the decoration. It shows up most easily where a suite is reused as a safety signal for a change it was not written against: passing suites feel like confirmation regardless of what they exercise, and nobody checks the coupling because the result agrees with the expectation. Two habits follow. State which single measurement is actually carrying the claim, rather than listing everything that came back green. And when a passing suite is genuinely insensitive to the change, say so in those words rather than dropping it, because a reader who finds it omitted cannot tell whether it was run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
