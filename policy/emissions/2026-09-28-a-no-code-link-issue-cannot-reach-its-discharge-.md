<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 717 on 2026-09-28: #717 is a cross-repo link whose only close condition (tim-nish/claude-toolkit#643 closing) was met on 2026-08-31, yet the run could not close it.

## The learning

An issue that exists only to hold a close coupling, and lands no code in this repository, has no route to a close. Admission scores it a clean pass, which always routes to implementation, and the admission verdict then demands a list of files the change touches — there are none, and there is no way to say none. The discharge close (the route meant for exactly this: ending a carrier that lands no code) refuses any issue without an admission stamp, and the run record refuses to record a pass until the issue is closed or a blocker is written. So each of the three acts waits on another, and the only exits are inventing a file list or closing by hand outside the typed path. The fix belongs in the tools: either admission needs a disposition for a carrier whose close condition is already met, or the discharge close should not require an admission stamp.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
