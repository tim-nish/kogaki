<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-27
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1211, 2026-09-27: preflight refused on a deleted runs/README.md; the commit plan read the deletion as intended because an earlier commit had removed the same file, the owner approved it, and master went red on runs-retention. The implementer's suite then failed on it and the file had to be reverted on master.

## The learning

Before committing the deletion of a tracked file, check whether any registered check requires that file. That an earlier commit deleted the same file is not evidence the deletion is wanted: a file that keeps coming back is more likely required by something (here a check, which is why a later PR restored it) than unwanted. The commit plan should read the suite's requirements, not the history of the path.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
