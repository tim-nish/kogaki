<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1370: one command ran git add -A over five paths and then git commit. One path, readers/, had already been removed with git rm, so git add stopped with 'pathspec did not match' and staged none of the five. The commit still ran, because the two were chained with && after a command that ignored the failure, and it recorded only the deletion staged earlier: a 25-line removal under a message describing a 22-file change.

## The learning

When git add is given several paths and one of them no longer exists, it stages none of them, not all but one. Any commit that runs after it records only what was staged before. After a commit that should hold many files, read the file count it reports. Do not name a path you have already deleted in the add; use git add -A with no paths, or only paths that still exist.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
