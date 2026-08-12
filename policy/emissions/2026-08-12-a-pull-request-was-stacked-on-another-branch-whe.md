<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A pull request was stacked on another branch. When the parent merged and its branch was deleted, the dependent pull request was closed automatically, and it could not be reopened: the interface refuses to reopen a request whose base branch no longer exists, and refuses to change the base of a closed request. The work had to be reopened as a new request with a new number, losing the original's identity and its comment thread. A local rebase of the branch had already been done and did not help, because what the interface reads is the request's own stored base pointer, not where the commits sit. Checked afterwards: the deletion was not caused by the flag passed at merge time — the repository is configured to delete branches on merge, so omitting the flag would have changed nothing.

## The learning

When work is stacked on top of other work, the dependency is recorded in two independent places: in the commits, and in the hosting service's own pointer for the request. Rebasing fixes the first and leaves the second untouched, and it is the second that the service acts on. So the order matters and only one order is safe: repoint every dependent request at the new target FIRST, confirm it, and only then merge and delete the parent. Doing it the other way is not recoverable by retrying — deleting the branch destroys the state the repair would need, which makes this a case where the usual instinct of fixing it afterwards does not apply. Note that the deletion may not be yours to withhold: where the hosting service is set to delete merged branches automatically, there is no flag to leave off, so repointing the dependents first is the only available order rather than the safer of two.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
