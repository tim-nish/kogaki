<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

Our convention records a required consultation as a commit whose message is the whole record — there is no file change, because the consultation is the act and the message is its evidence. So the commit is empty by construction. When a stacked branch was replayed onto the new base after its parent merged, using the documented recipe, the rebase silently discarded that commit along with the parent's. The branch arrived with its consultation performed, its evidence written, and no trace of either. Nothing in the rebase output mentioned it. It surfaced only because a separate mechanical check re-ran on the new head and went red for a reason that had been satisfied minutes earlier.

## The learning

Rebase drops empty commits by default, and a record whose whole content is its message is empty by definition — so any convention that stores evidence in a commit message with no accompanying change has built something a routine history operation deletes without saying so. The two properties that make it dangerous together are that the record is invisible to the operation (no diff to conflict, nothing to report) and that its absence is indistinguishable from never having done the work. Anyone auditing afterwards sees a branch that skipped a required step. Three things follow. Prefer carrying such a record in something with content — a line in a file the change already touches — so the history operation has something to move. Where the message really is the right home, pass the flag that keeps empty commits, and put that in the recipe rather than in someone's memory, especially when the recipe itself is written down and followed by people who did not choose the storage format. And notice that the mechanical guard is what saved this: an obligation whose evidence can silently vanish needs a check that re-runs on the final state, because every check that ran before the operation was correct and none of them was still true afterwards.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
