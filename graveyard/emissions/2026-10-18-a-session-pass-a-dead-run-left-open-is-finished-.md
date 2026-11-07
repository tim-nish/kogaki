<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-19 a --session run of kogaki#1439 found the previous day's run had started the pass, written the whole change, and stopped before committing or finishing. The new run committed that work and called finish against the old start row; the suite failed only because the commit carried no consult receipt for the check-infrastructure boundary.

## The learning

A pass left open by a run that died is not a stop: the next run can commit the work it left on disk and finish the old pass, and finish grades it against the old base. But a fix after that failed finish needs a fresh start taken on the base before the fix commit is replayed, or the pass reads as no change. A commit that touches checks must carry its consult receipt in the commit message itself, because the suite's boundary check reads the branch, not the Issue thread where the consult was first recorded.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
