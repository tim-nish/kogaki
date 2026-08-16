<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A work item was put on hold until something in another place finished. Being on hold marked it so that the routine sweep over outstanding work skips it. The other thing finished, and the item stayed on hold — because the only process that would have noticed was the sweep the hold removes it from. It surfaced a day later only because someone named the item directly.

## The learning

A hold that removes an item from the queue also removes it from the only thing that would notice the hold ending. The mechanism that files it away is the same one that would have retrieved it, so the wait outlives its reason and nothing reports that. Do not rely on the routine pass to release holds: attach the release to the event the hold is waiting on — the moment the other thing finishes is when the question is both decidable and cheap, and it is the only moment anyone is looking at both halves. If the waited-on thing is somewhere you cannot attach anything, then say plainly in the hold that nothing will release it and name who must look, rather than leaving a queue's silence to be read as patience.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
