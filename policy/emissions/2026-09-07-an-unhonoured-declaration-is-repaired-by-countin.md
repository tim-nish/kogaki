<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#964: two sibling schema fields declared a record filename as a glob that neither a reader nor a writer honoured, written as one pattern with a third that kogaki#961 had just repaired by reshaping it to a suffix every producer derives from. The obvious move was to apply the same repair to both siblings. Counting the sites separated them: one had two writers and a scanner, the other had one writer and no scanner anywhere, and its own rationale — covering record N+1 — described a population that is zero in the tree by an explicit out-of-scope decision. The first was honoured; the second was retired. And the honoured one added no mutation probe: with scanner and writers both deriving, they move together over a set that is empty either way.

## The learning

A precedent that repaired one unhonoured declaration is a precedent about a FORM, never a standing preference for the honour direction, and applying it to the next sibling without recounting is how one repair becomes a policy nobody ratified. What decides the direction is the site census — how many writers, how many matchers, and whether the population the declaration exists to cover is non-empty in this tree. Honouring buys a real property, and it is narrower than a probe: with every site deriving, the declaration and the filesystem CANNOT disagree, so the divergence is removed rather than detected. That is not the same as a check that goes red, and where the covered population is empty no check can go red at all — so a repair claiming detection when it bought construction is claiming the wrong thing. Where the population is empty by decision rather than by accident, adding coupling nothing exercises is worse than deleting the name: it puts a live-looking join in the tree whose only reader is a future maintainer's inference. Retiring is the honour direction's peer, not its failure case.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
