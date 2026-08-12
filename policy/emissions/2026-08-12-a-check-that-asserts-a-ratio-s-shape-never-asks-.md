<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

I added a conformance property requiring a figure be stated per family rather than pooled, and wrote the check to match: per-family rows exist, no pooled ratio appears anywhere, and each denominator is read from the right source rather than re-derived. Six mutations, all killed. A reviewer then pointed out that the numerator and the denominator ranged over different populations — the denominator counted candidates that the code made structurally impossible to reach, and the numerator counted items the denominator's set never contained. On the block's own fixture it rendered two-of-two where one of the two was ineligible; one more input and it renders three-of-two. Every assertion I had written passed on that.

## The learning

A ratio has a property no assertion about its parts can see: that both sides range over one set. Checks get written against the thing that went wrong — here, a pooled figure hiding which group was reached — so they assert presence, absence and provenance of each side, and each of those can be perfectly true while the fraction means nothing. The tell is that you can state the numerator's rule and the denominator's rule in separate sentences without either mentioning the other; when that is possible, nothing is holding them to the same population. The cheap guard is to assert the relation rather than the parts: the numerator can never exceed the denominator, asserted over every group rather than over the one case you happened to build. That single line would have caught this, and it catches the next substrate too, which enumerating cases does not. Worth noticing that an impossible fraction is worse than the defect it replaced: a reader can see that a pooled figure is hiding something, and cannot see that a well-formed one is measuring two different things. Repairing a class is where you are most likely to instance it, and the instance will be the part the original report did not name.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
