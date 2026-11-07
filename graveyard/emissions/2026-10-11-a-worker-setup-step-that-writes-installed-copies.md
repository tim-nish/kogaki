<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki#1343 a worker dispatched on a branch carrying an edit to a tracked skill file stopped as 'uncommitted'; the only dirty file was that skill, rewritten by the lane's own setup step from the main branch's copy.

## The learning

A setup step that copies files into a fresh working copy is only safe for files the repository does not track. When it writes a tracked file, it silently reverts whatever the branch changed there. The worker did nothing wrong, but its run is graded as unfinished work. The step should skip, or refuse, any target the branch itself commits.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
