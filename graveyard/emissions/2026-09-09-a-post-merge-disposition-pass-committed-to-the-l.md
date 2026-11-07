<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A post-merge disposition pass committed to the local default branch without fetching first, and diverged it. The squash merge had landed on the remote; the local branch still pointed at the pre-merge tip, and the pass wrote its two finding rows there and committed. `git rev-list --left-right --count` then read 1/1 — the remote holding the merge, the local holding the rows — where the tree had been in sync minutes earlier.

## The learning

An act that lands work on a REMOTE and an act that commits locally are two writers to one branch, and a pass that runs after the first without re-reading the branch will build on a tip that no longer exists. It is invisible while it happens: the commit succeeds, the message is right, and the rows are correct — only the ancestry is wrong, and nothing in the pass's own output reports ancestry. The tell is timing rather than content, so the check is positional: any local commit to the default branch made after something merged remotely in the same sitting owes a fetch first, and the cheap assertion afterwards is a two-sided ahead/behind count rather than a log of the last few subjects, which reads plausibly in exactly this state. The repair is a rebase and costs nothing; the cost is entirely in not looking, because a diverged default branch is discovered by the next push, in whichever sitting happens to make it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
