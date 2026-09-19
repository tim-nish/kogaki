<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A /brief run over a 6-member Strand set was expected to die, because a recorded observation said the compose step fails deterministically at five or more members. It did not fail: the step took about five minutes and the run completed through both gates to a finished Brief.

## The learning

A recorded note that a step fails past some input size usually records one observed failure, not a measured limit. Before letting such a note change what you attempt — trimming the input, splitting the work, warning the owner off — check whether it names a mechanism that would make the failure certain, or only the one time it was seen. If it is the second, run the thing and let the run be the evidence; a step that is merely slow looks exactly like one that is about to fail, right up until it finishes.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
