<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-21
repo: Kogaki
grain: lesson

## Trigger — what happened

The /ship-cycle 1174 run merged PR #1178 within minutes of its only review round landing, then ran the declared close-time reconciliation pass. That pass answered 'no open PRs' and wrote nothing: the PR it needed to dispose was already closed. The round's four carried findings existed only in the round report, which no later act reads.

## The learning

A sweep scoped to open work disposes nothing about work that has just closed. The four findings the round carried were addressed to a registry file, and the act that writes them is the disposition pass the sweep would have run had the pull request still been open; merging first made the sweep's own scope exclude the thing it was there to finish. Naming the pull request directly ran the same pass and wrote the rows. Two things follow for any run that merges quickly. The disposition is owed per pull request, not per sweep, so a run that merges before its close-time pass must name the pull request rather than rely on a scope that reads the board. And the pass commits its rows onto the default branch without publishing them, onto whatever that branch pointed at when it started, so the commit it leaves behind has to be pushed by the run that caused it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
