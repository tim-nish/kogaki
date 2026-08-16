<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A shared append-only log was moved to a new location, and every producer was re-pointed at the new one in the same change. One entry still arrived at the old location three and a half minutes later, written by a session that had started before the move and was holding the old address. Every entry since has gone to the right place. The stray entry sat where nobody reads any more, and was found only because someone later audited the old location for an unrelated reason.

## The learning

Re-pointing every producer at a new destination does not stop writes to the old one, because a job already running holds the address it was given at start. The move is atomic in the source and not in the running system, so there is a window equal to the longest in-flight job. This is a different failure from writing to a destination that has been retired: that one can be refused at the write, since the destination knows it is dead, whereas a superseded-but-still-live destination has no basis to refuse and probably should not, since the writer is behaving correctly against the contract it was handed. The practical move is to sweep the old location once after the window has passed, migrate anything that landed there, and record where it came from. Refusing the write is the wrong instinct here and worth naming, because the refusal would punish a correct actor and the entry would be lost rather than misfiled. A single straggler across one move is an observation and not yet a defect; what makes it worth writing down is that nothing in the system would have surfaced it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
