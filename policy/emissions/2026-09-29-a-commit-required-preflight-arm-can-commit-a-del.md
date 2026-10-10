<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1224's preflight refused only on a deleted runs/README.md; the commit-required arm dispatched /commit-groups, the owner approved committing the deletion, and the push turned master's runs-retention check red, the third time this deletion was committed and reverted.

## The learning

The commit-required arm treats every modified tracked file as work to commit, but a deletion can be an accident on disk that a required check exists to forbid. Before proposing a commit for a path, read whether a registered check asserts that path is tracked; where one does, the recovery is restoring the file, not committing its absence.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
