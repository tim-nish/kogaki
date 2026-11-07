<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #1004 spent both review rounds on its own revisions and landed clean. Two sibling PRs then merged into master, the rebase that resolved the conflict moved the head, and review presence went stale with no round left to clear it. The declared bypass did not apply: the served position triggers it on 'the thing being repaired is the thing blocking the repair', and nothing here was repairing the review mechanism.

## The learning

A review-round budget counted per pull request is spent by that pull request's own revisions, but it is also CONSUMED by events the pull request did not cause: any sibling merge that forces a rebase moves the head, invalidates the presence report, and costs a round the budget never priced. So the budget's unit and the invalidation's cause are different things, and a bound that does not distinguish them leaves a clean, twice-reviewed change with no in-mechanism route to merge — while the declared bypass of last resort correctly refuses, because its trigger is a broken gate rather than a stale one. Two consequences worth carrying: a rebase forced by a sibling is not a revision and should not be charged to the same counter that revisions are; and where it is charged anyway, the honest exits are raising the bound or leaving the pull request open, never widening the bypass to cover a case its own statement excludes.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
