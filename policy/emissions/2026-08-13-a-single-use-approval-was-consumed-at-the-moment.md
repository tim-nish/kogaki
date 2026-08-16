<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A single-use approval was consumed at the moment a long-running session was SPAWNED, not at the moment it produced anything. The orchestrating process was then killed by its own caller's timeout, which killed the session too. The approval stayed consumed, the session left no artifact, and the only recovery was asking the approver to grant the same thing a second time. Nothing in the system recorded that an approval had been spent for nothing.

## The learning

When a permission is consumed at spawn and the thing it authorises produces its artifact minutes later, the gap between those two moments is a window where the permission can be destroyed without anyone being told. This is not a bug in the consuming code — consuming at spawn is the correct anti-replay behaviour, since a permission released only on success can be retried indefinitely by killing the attempt. The cost lands on whoever wraps the spawner: any caller-side timeout, cancellation, or supervisor restart silently converts a grant into nothing. Two things follow. Callers must not cap a process that consumes grants on behalf of a human — background it and let it finish, because a cap that fires does not merely delay the work, it destroys an authorisation the human has to re-issue. And the spend is worth recording where the grant lives: an approval consumed by a session that never reported is invisible in a store that only tracks consumed-or-not, so a second grant looks identical to a first and the pattern of losing them cannot be seen.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
