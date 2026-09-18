<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#1142 landed a new suite member whose admission record, in both registries and in the check's own header, stated that the runner reads any non-zero exit as a failed member, so a gateway-less environment leaves the member RED and awaiting an owner decision. The sentence was copied from the sibling member admitted one issue earlier. It was false at the time it was written: the runner had learned the degrade grade in that very issue, and running the suite with the gateway pointed at a missing path graded the new member 'degrade' -- named, not failed, and the head's verdict withheld from the cache. The sibling's own record still carries the stale sentence.

## The learning

Copying a sibling's admission prose copies its facts about the surrounding machinery, and those facts go stale in the same change that fixes the machinery. The sibling here declared an unresolved collision between a degrade contract and a runner with no vocabulary for it, and named the owner decision that would settle it; the decision was taken, the runner learned the grade, and nothing went back to amend the sentence that had described the gap. The next member copied it. A claim about what the runner does with an exit code is cheap to check -- run the suite with the seam removed and read the grade -- and expensive to leave, because an admission record is what a later reader trusts instead of re-deriving. So a copied paragraph asserting something about a shared mechanism is re-measured at the head that copies it, not inherited; and finding it stale is evidence about the SOURCE record too, which is a separate carrier's repair and should be named as such rather than silently fixed in the copy.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
