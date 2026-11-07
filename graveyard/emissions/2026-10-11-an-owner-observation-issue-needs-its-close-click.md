<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1066 carried a live-run observation. The observation was recorded as met on 2026-09-10 and both parents closed that day, but nobody clicked the discharge. Ten days later a ship-cycle run was denied at dispatch (by design) and its failure comment read a dead 09-19 run as proof the owner act was still outstanding, so the issue read as live work for another month until the thread was re-read.

## The learning

An issue whose deliverable is an observation has no pull request to close it, so meeting its acceptances and closing it are two separate acts, and the second needs an owner click. If the click does not follow the observation in the same sitting, the issue keeps reading as open work, and the next tool that touches it will record its own failure as the issue's state and bury the earlier evidence. When an observation is recorded as met, spend the discharge in the same sitting; and when reading an issue's state, read the whole thread, not the latest comment.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
