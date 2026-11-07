<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

Two sibling issues (#811, #812) were predicted at plan time to overlap on checks/registry.json with no logical dependency, so the younger was stacked on the elder's branch. The elder went through two review rounds, and both of its round-2 fixes landed in the same two registry fields the younger branch had also edited. When the elder merged and the younger rebased onto master, the conflict was on exactly those fields — and the obvious resolution, keeping the side that carries this branch's own additions, would have silently reverted the elder's round-2 work while every check still passed.

## The learning

When a stacked sibling rebases after its elder merges, the conflict is not just between the two branches' edits — it is between the younger branch's edits and whatever the elder's REVIEW changed after the younger was cut. Those late fixes are the most valuable content in the field and the least visible in the conflict, because they look like ordinary upstream text next to your own deliberate addition. Resolve by taking the upstream side whole and re-applying your own additions on top, and make the resolution ASSERT on a distinctive phrase from the elder's late fixes so that taking the wrong side is a hard error rather than a green suite. Nothing else catches it: the registry is not code, no check reads for a clause it does not know to expect, and the reverted text passes every mechanism precisely because a well-formed older version is still well-formed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
