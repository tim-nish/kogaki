<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-09
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1314 --session, 2026-10-09: an earlier worker run on #1314 failed (verification-refused) after deleting the hook it was editing. This run carried the cell in the session, the pass graded implemented, PR #1316 merged and closed the Issue, and the close screen still printed FAILED at implement with the earlier run's refusal text.

## The learning

The close grade reads the newest worker-reap failure row for the Issue even when a later run, in a different session, finished the same cell cleanly and merged it. Moving the cell from a worker to the session does not change this, because record-pass stops at the reap row before it looks at who wrote it. Until record-pass checks the row's run or session the way the close reader does, a re-run after a failed worker run has no correct close screen, and the real outcome has to be read from GitHub (Issue closed, PR merged).

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
