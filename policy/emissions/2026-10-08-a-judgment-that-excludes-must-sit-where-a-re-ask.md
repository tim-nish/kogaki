<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-08
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1307: a Brief run ended with no Reader Path and no question because the Move-fit judgment ran after Path Review over all Candidates at once, and the one finished Candidate it excluded could not be recomposed by anything downstream.

## The learning

When a step can reject a piece of work, place it where the work can still be redone. A content check that runs after the producing step has finished can only throw work away; the same check run inside the producing step, as one re-ask carrying the checker's own sentence, can get the work fixed. Separate the two ways an answer fails: an answer with no readable record (malformed) is retried as-is and costs nothing, while a readable record that is wrong (refused) gets one re-ask with the reason. Mixing them spends the single re-ask on noise.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
