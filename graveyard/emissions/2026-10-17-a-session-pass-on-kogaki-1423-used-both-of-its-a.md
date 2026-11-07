<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

A session pass on kogaki#1423 used both of its allowed attempts on one failure: the second suite run at the same commit was a replay of the stored failed result, not a new run.

## The learning

A stored check result is reused whenever the commit and comparison base match, whether it passed or failed. So after fixing an environment problem, a second attempt at the same commit repeats the old failure and spends an attempt without testing anything. Before retrying, force a fresh run by changing the comparison base spelling; you can tell a replay by its temporary directory names, which match the first run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
