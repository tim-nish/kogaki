<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-08
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #1022 merged with two findings marked to go to the findings register. The rows were not there afterwards: only the review lane's disposition pass writes them, and the recorded expectation was that merging first loses them for good.

## The learning

It did not lose them. The disposition pass, pointed at the merged pull request by number, still resolved it and appended both rows. The recorded rule had generalised from the pass that sweeps OPEN pull requests — that sweep no longer sees a merged one — to the pass itself, which does. So a side record that a merge outran is worth one targeted retry before it is written off, and the cheaper discipline is to merge on the green gate and run the record pass after, rather than holding a ready merge open to keep a bookkeeping step in reach.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
