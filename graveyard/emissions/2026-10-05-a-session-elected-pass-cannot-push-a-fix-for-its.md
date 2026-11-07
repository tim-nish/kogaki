<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-05, /ship-cycle 1273 --session finished its session pass, opened PR #1275, and review round 1 returned two should-level findings. The session committed the fixes, but the push hook refused them because the session record graded the earlier head and said a later commit needs a new session-cell finish. session-cell finish then refused because the cell had already finished its one pass. The fixes could not leave the machine, and the PR merged at the round-1 head with the findings left in the register.

## The learning

For an Issue implemented in the session, the push rule and the one-pass rule cannot both hold once a review round asks for changes. The push hook allows only a head that a finish graded, and finish allows one grading per cell. A session-elected pass therefore cannot answer its own review round. Either finish must be able to re-grade a later head on the same branch, or the push hook must accept a later head that descends from the graded one and passes the suite. Until one of those changes, review fixes for a session pass need a separate carrier.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
