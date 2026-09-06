<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle cleanup pass over issue #890 produced a plan with no executable rows: the merged branch 890-terrain-the-owner-s-gate-answer-is was report-only because a worktree held it (`git branch -D` would refuse), and that worktree was 'keep' because 'clean tree on a branch that is being kept'. The worktree's owning session was dead and no claim covered it.

## The learning

Two cleanup rules can each defer to the other and leave the pair permanently unexecutable. A branch rule that yields to a checkout, and a worktree rule that yields to a kept branch, are each individually safe and correct; together they form a cycle no run can break, so the leftovers survive every cleanup pass forever. Neither rule is wrong on its own terms, which is why no single-rule review finds it. A deferral rule owes a statement of what breaks the tie when the thing it defers to is itself deferring back — otherwise the safe answer is a deadlock that looks like a clean plan, because a plan with zero rows reads as 'nothing to do' rather than 'nothing can be done'.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
