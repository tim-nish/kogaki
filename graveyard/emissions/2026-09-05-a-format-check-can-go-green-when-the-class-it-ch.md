<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#861: the neighborhood row's claim line dropped its trailing level, which left the class pinning no literal text at all. A new sibling class was added for the row's target line, and the fixture case asserting the surface admits every emitted line stayed green when that new class was deleted from the grammar — the permissive claim class silently absorbed the line.

## The learning

A check over a whole surface can be satisfied by the most permissive rule in it, so deleting the specific rule you are actually testing changes nothing the check can see. When one rule in a set loses its last literal detail, it starts admitting its neighbours' lines, and any check that only asks 'was this admitted somewhere' stops discriminating. The fix is to drive the named rule directly — ask whether THIS rule admits the line, and whether it refuses the line it is supposed to refuse — and to keep the whole-surface check beside it for what it still covers. Found by deleting the rule and re-running, not by reading the check.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
