<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-22
repo: Kogaki
grain: lesson

## Trigger — what happened

Executing an untrack ruling, a run removed private harness files from tracking and ran the full check suite in its own working tree, where the files were still present because untracking leaves them on disk. The suite passed. On a fresh clone three registered checks failed immediately, because they read the files that had just stopped being shipped — and the same removal deleted the files from the working copy the moment a branch switch touched them.

## The learning

Removing a file from version control is two changes, and a working tree shows neither: the file stays on disk, so any test that reads it keeps passing locally while failing for everyone who checks the project out fresh; and it disappears from your own copy as soon as you switch branches, taking any live tooling it was serving with it. So verify a tracking change by testing a fresh copy, never the copy you made it in, and back up anything the removed files were doing real work for. The rule for deciding what may go: a file that the project's own automated checks read has to stay, because those checks run on a fresh copy where it would be missing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
