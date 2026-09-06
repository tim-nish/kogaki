<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on issue #918 held at the merge barrier. PR #920 (for #918) had no review round, so the run invoked the declared review_reconciliation pass -- which the contract invokes exactly ONCE per run. The sweep ordered PR #921 first and spawned its round; #920 was then refused with '1 spawn(s) live against a bound of 1 (max_concurrent_spawns)'. The run's one invocation was spent on a PR that was not the run's own named issue's PR, and #920 cannot obtain review this run by any licensed path.

## The learning

A budget of one invocation composed with a concurrency bound of one means a run can review at most one pull request, and the sweep's own ordering -- not the run's frontier -- picks which. Each rule is right alone: invoking once stops a run improvising many reviewer sessions, and a concurrency bound of one stops the machine being swamped. Together they hand the run's single review to whichever PR the sweep happens to order first, and silently starve the one the run was invoked for. The refusal even names the recovery -- 're-invoke once one finishes' -- which the once-per-run rule forbids, so the two surfaces give contradictory instructions with nothing saying which governs. A once-per-run budget owes a statement of what happens when the act it buys is refused for a reason that will clear on its own: a spent invocation that accomplished nothing for the run's own frontier is worse than no invocation, because it looks like the review path was tried.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
