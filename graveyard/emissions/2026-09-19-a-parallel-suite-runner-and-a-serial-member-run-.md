<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round graded a pull request blocking on two red suite members. Run alone at the same commit, one of them passed; the other was a missing consult receipt and was real. The round's own note said the same thing from the other side: the member failed in the lane's local invocation and passed by name in CI's run at that identical sha.

## The learning

When a check suite runs its members in parallel, a member that fails under contention and passes alone is not evidence about the change. A gate that reads such a suite is reporting the runner's scheduling as if it were the code's state, and a reviewer holding one of the two results cannot tell which it holds. So a red member is worth re-running alone before it is carried as a finding, and a suite whose parallel and serial verdicts can disagree at one commit owes a statement of which run decides -- otherwise the same head is both green and red depending on who asked.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
