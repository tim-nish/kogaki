<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

ship-cycle 1353, PR #1354: round 1 graded five checks blocking as new failures against base; every one was a registry row whose file is installed per checkout and never present in the review lane's fresh worktree, and the same head passed 40 of 40 in the worker's suite and in CI

## The learning

A review whose suite runs in a bare checkout will report every installed-not-tracked file as a new failure, at base and head alike, and read it as the change's fault because the base comparison cannot resolve a file that does not exist on either side. When a repository moves a directory from tracked to installed, every runner that builds its own checkout needs the install step the moment the move lands, or it must tell a missing file apart from a failing one. Until it does, the reader of such a report checks whether the named members' files exist in that checkout before treating the red as evidence.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
