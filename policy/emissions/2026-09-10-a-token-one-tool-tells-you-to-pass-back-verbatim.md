<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1068 ship-cycle close, 2026-09-10. The merge tool refused a merge and printed its own state token together with the instruction to pass that token back verbatim to the tool that records the run's outcome. The recording tool's vocabulary for that field does not contain the token, so the call was refused at the argument parser. The session had to choose a substitute and say in the free-text note that it had.

## The learning

When one tool prints a value and tells you to hand it to another, the two vocabularies have to be one vocabulary, and nothing checks that they are. The instruction to pass a token back verbatim reads as a guarantee that the receiver accepts it, which is exactly why the gap is only found by a run that hits it — and by then the person is standing at a closing act with a refused command, free to pick whatever nearby word looks close enough. That substitution is the real cost: the record then carries a word nobody chose for it, and no field says a substitution happened. Two ways out, and they are not equivalent. Widening the receiver's vocabulary keeps the handoff honest. Having the sender print only tokens the receiver declares removes the possibility instead of catching it, and is better where the sender can be made to read the receiver's list rather than carry its own copy.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
