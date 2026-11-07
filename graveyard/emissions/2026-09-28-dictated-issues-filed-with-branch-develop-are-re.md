<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1216 on 2026-09-28: admit-issue plan refused because the owner-dictated body said Branch: develop while kogaki converges into master and origin has no develop branch; #1215, filed the same day, carried the same line and was hand-edited to master before it shipped.

## The learning

The dictated filing path in kogaki produces bodies whose Branch line names develop, a branch that does not exist here. Admission then refuses every such issue until someone edits the line to master. The fix belongs at filing time, where the Branch line should be taken from the declared convergence branch, not at each admission by hand.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
