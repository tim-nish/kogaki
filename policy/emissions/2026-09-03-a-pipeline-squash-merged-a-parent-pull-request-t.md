<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A pipeline squash-merged a parent pull request, then rebased its stacked child onto the new default branch — the recipe its own contract requires. The rebase changed no content: the child's diff against its base was byte-identical before and after. But the rebase produced new commit shas, and the merge gate keyed on 'the current head carries a passing review report'. The report named the old sha, so it read stale, the review round budget was already spent, and the child could not merge. The pipeline had invalidated its own verification by performing the step it mandated.

## The learning

A verification bound to a commit identity rather than to the content it examined is destroyed by any mechanical history rewrite, including rewrites the process itself requires. The two failure shapes look identical at the gate — a head that moved because someone fixed something, and a head that moved because it was rebased — and nothing in an ordinary round record distinguishes them, because such a record holds a head identifier and an outcome but never a reason the head changed. Where a process both mandates rewrites and gates on identity-bound verifications, it will periodically spend its whole review budget re-examining work that did not change; the cheap repair is to record why a head moved at the moment it moves, since that is the only point where the reason still exists.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
