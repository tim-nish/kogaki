<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A long-running batch command observed a repository's working copy, then went away to run a review that took seven minutes. While it waited, a second session checked out a different branch in that same working copy and committed twice. The first command came back and was about to edit files, believing it was still on the branch it had observed.

## The learning

A command that observes a shared working copy and then acts on that observation minutes later has no guarantee the two describe the same tree — and nothing in the tree announces that it moved. Re-read the branch and head immediately before the first write, not only at the start; the cheap read is the one that would have caught it. Where another session may be live, do the writing in a separate checkout created outside the shared copy, which costs almost nothing and removes the race entirely rather than detecting it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
