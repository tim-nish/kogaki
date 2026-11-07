<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run for kogaki#823 ran its main-tree branch guard at the observation step (exit 0, on master), created a feature branch, implemented, and committed. The commit landed on master. A concurrent session working the same issue in its own worktree had, in between, taken the same branch name and switched the shared main tree back to master. The guard was correct when it ran and the property it guards was false when it mattered. The same run's one-shot PR listing reported zero open PRs; the other session's PR for the same issue was opened minutes later, so the run implemented an issue that was already in review and produced a second, independent implementation of it.

## The learning

A check that reads a shared resource once, at the start, cannot bind that resource for the rest of the run when other actors can still change it. The guard is not wrong and re-running it more often is not the fix — between any read and the act it authorises there is a window, and a second actor with write access to the same working tree is inside that window by construction. Two consequences worth separating. The first is that a guard of this shape states a fact about the past and gets read as a promise about the future, which is invisible precisely because the reading is true when it is taken. The second is that the safe act is the one that does not depend on the shared resource at all: work done in a private worktree cannot have its branch switched out from under it, so the isolation that was optional for speed turns out to be what makes the guard's property hold. Where two runs can touch one tree, prefer binding the act to something the other actor cannot reach over checking the shared thing more carefully. And a one-shot inventory of what other actors are doing — open pull requests, live branches — has the same shape: it dates from the moment it was taken, and a sibling starting work one minute later is indistinguishable from one that never existed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
