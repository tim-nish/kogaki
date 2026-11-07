<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run's own live claim on the issue it was driving withheld the two cleanup rows for the branch and worktree that same run had created — classify excluded them correctly under the live-claim rule, so the cleanup plan came back with nothing executable for the work just finished.

## The learning

A lease that is released only after cleanup makes a run's own output invisible to its own cleanup. The exclusion rule that protects a concurrent session's worktree cannot tell that session from this one, because liveness is all it reads. So release the lease before the cleanup that is meant to collect what the lease was held over, not after it — otherwise the run reads as tidy while leaving exactly the branch and worktree it just minted. The ordering is a property of the pipeline, not of the exclusion rule, and the exclusion rule is right to be blind here.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
