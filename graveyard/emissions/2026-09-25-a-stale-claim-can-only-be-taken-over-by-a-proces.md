<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-25
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1194 found a dead worker's stale claim; reclaim with the session's own pid refused because that pid's working directory is the main tree, and stating --worktree is refused as a replacement for the derived one

## The learning

Taking over a stale lease derives the worktree from the holder process's current directory and will not accept a stated one in its place. The orchestrating session never stands in the issue worktree, so its own pid can never be the holder. What worked was starting a long-lived process whose working directory is the worktree, reclaiming with that pid, and stopping it at release. The claim then belongs to the session through the process tree, and the implementer dispatch accepts it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
