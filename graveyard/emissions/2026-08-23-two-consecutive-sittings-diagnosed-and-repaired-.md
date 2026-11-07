<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-23
repo: Kogaki
grain: lesson

## Trigger — what happened

Two consecutive sittings diagnosed and repaired a failing capability — first that it could not reach its entry point, then that it could not deliver its output. Both diagnoses were correct and both repairs were real. A third sitting found that the whole component was a duplicate of one that had migrated to a shared engine, and that each repair had made the duplicate harder to remove.

## The learning

A correct diagnosis of WHY something fails says nothing about whether it should EXIST, and the two questions are answered by different reads: the failure is read from the component, while its redundancy is only visible from the boundary the component sits on. A debugging session naturally reads inward — logs, call sites, the failing act — and every step of that read is evidence about mechanism, none of it about warrant, so the more precisely the fault is localized the more the question of whether to have the thing at all recedes. The tell is a repair chain where each fix is sound and the next failure is one layer further out: that shape is what a duplicated stack produces when it is being kept alive, because you are re-deriving capabilities the other stack already has, one incident at a time. So before the SECOND repair to one component, ask what else in the portfolio does this job — and treat the answer as the more urgent finding, because each repair spends effort AND raises the cost of removal, which is the compounding a plain bug does not have.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
