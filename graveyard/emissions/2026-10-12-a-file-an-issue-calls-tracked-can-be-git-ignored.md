<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1347 planned its term list for .claude/issue-sync.json, calling it the one tracked file allowed to carry the word; at dispatch the file turned out to be git-ignored, so a check reading it would be red on every fresh clone.

## The learning

Before an Issue names a config file as the input of a registered check, confirm with git ls-files that the file is tracked. A git-ignored file is invisible to git grep and absent in CI, so a check that reads it fails everywhere except the machine it was written on. A worker also cannot write under .claude/, so a file there is a session step even when it is tracked.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
