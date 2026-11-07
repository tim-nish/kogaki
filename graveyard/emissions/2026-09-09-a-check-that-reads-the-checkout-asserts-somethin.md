<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A check asserting what a committed settings file registers read that file from the working tree. The reviewer's sandbox omits that file on purpose, so the check failed there on five consecutive rounds and the failure was recorded as 'could not determine' rather than as a finding — a suite that was never green anywhere the reviewer ran it.

## The learning

When a check's claim is about what was committed, read the commit, not the files on disk. The two agree in an ordinary checkout, so the difference never shows up while you are writing the check; it shows up in the one place the check most needs to work, a sandbox built deliberately without some of those files. The general shape: a guarantee that depends on a file simply being present is not carried by the code, it is carried by the surroundings, and it disappears silently when the code is run somewhere those surroundings differ. Ask what your check reads and whether that thing is guaranteed to exist wherever the check will run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
