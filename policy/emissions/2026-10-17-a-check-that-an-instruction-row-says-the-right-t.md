<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1414 added a criterion to a model judge's instruction row and needed a fixture proving the judge refuses the case that prompted it, with only a scripted stand-in judge available in the check suite.

## The learning

When the real judge is a model the check suite cannot call, a stand-in judge can still be tied to the instruction text: script it to refuse the bad case only when the instruction it is handed contains the new criterion. Then the fixture runs the whole stage (the judge's input carries the case, its refusal flows back into the next attempt) and goes red the moment the criterion is removed from the row, which a plain 'the row contains this sentence' test proves only about the document. It still does not prove a live model refuses; say so beside the fixture.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
