<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki #1396 (2026-10-15) the worker finished all three commits and was reaped suite-failed because the registered suite's one red was brief-reader-path-job case (b2), the timing flake emitted earlier the same day. No PR existed, so the Issue could not close; re-running that check alone at the same head passed with nothing changed.

## The learning

When a worker's reap row says suite-failed and the only red member is a check already known to flake, confirm by re-running that one check at the reaped head; if it passes, do not re-dispatch a worker (the failure bound counts it and the suite re-spends every stage). Instead elect the session, add a worktree at the default branch, install the policy kit there, cherry-pick the worker's commits inside a session-cell start/finish pair, run the suite with --compare-base against the default branch, push, open the PR and let the review lane's round run. The whole carry took about fifteen minutes against a full worker re-run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
