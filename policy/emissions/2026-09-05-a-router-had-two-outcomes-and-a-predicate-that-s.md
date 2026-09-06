<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A router had two outcomes and a predicate that split them at 'not holds' versus 'holds'. A three-valued verdict fed it, so the undecided answer was swept into the first outcome. Narrowing the predicate to the definite failure would instead have sent it to the second outcome, whose own stated ground was that everything held — false in that case.

## The learning

When a three-valued signal feeds a two-way branch, both ways of writing the predicate are wrong, and which one is wrong is easy to miss because each looks right from its own side. The undecided value belongs to neither branch: one branch acts on a defect that was not established, the other reports a cause whose premise the undecided value contradicts. Check this by reading each branch's stated GROUND rather than its condition — if a ground says 'everything holds' and the value means 'we could not tell', the branch is lying whichever way the condition is written. The repair is a third outcome that says the location is undecided and names what is unsettled, not a better two-way split.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
