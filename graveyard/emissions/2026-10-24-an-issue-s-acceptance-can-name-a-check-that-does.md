<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1578's Acceptance named checks/check-spec-structure.sh; admission passed the Issue, and only the implementing sitting found that no such check exists in the repository

## The learning

Admission reads whether a plan's files have a covering check, but it does not read whether a check an Acceptance bullet names exists. So an Issue can be admitted promising a check that nobody can run, and the gap shows up only when the work is done. The sitting covered the promise with a word-for-word test in an existing check and said so in the pull request.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
