<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1186 on 2026-09-28: branch 1186-worker held six finished, unpushed commits; the worker's tree under /tmp/issue-sync-workers had been deleted, and spawn-implementer refused with 'worktree add failed: A branch named 1186-worker already exists'.

## The learning

The engine reuses a worker's tree only when the directory still exists. Otherwise it always creates a new branch, so a branch that outlived its temporary directory (a reboot or tmp cleanup is enough) has no typed route back to a pull request. Each refused attempt still posts a dispatch-row, so blind retries also spend the unchanged-inputs guard. Work that lives only on an unpushed local branch under a temporary tree is one cleanup away from being stranded. The engine should resume an existing branch with 'worktree add <path> <branch>' when the tree is gone.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
