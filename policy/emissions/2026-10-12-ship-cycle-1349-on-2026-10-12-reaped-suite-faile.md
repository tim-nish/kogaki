<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1349 on 2026-10-12 reaped suite-failed because the worker worktree had no installed policy kit after kogaki#1346. The dispatcher already had a per-repository hook for this: the lane declaration's optional setup member, one command run once in each fresh worktree before the worker starts (claude-toolkit#1212). kogaki had never declared one. Declaring it, and recording an admission amendment that names the declaration change, let the same cell re-dispatch; the suite passed 39 of 39 in the same tree once the kit was installed.

## The learning

When a tracked directory becomes an installed one, look first for the setup step the dispatcher already runs per fresh checkout and declare the install there; the fix is a declaration in the machine-local lane file, not code in the dispatcher. Two things ride along: the installer rewrites tracked kit-managed files, so the setup step restores them to the base commit or the worker is reaped as dirty; and any change to that declaration changes the allow-file hash the first dispatch stamped, so a plan amendment naming the change must precede the next dispatch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
