<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

Review round 2 bundled two repairs into one declined finding — correcting the pull request body, and rewrapping a line one column over the file's margin — and declined both on a single cost claim: that either 'would cost a new head with no round remaining to review it'. That claim is true of the rewrap and false of the body edit: editing a pull request's description creates no commit and leaves the head sha untouched, which was confirmed by making the edit and re-reading the head. The body was the half that mattered, because it becomes the post-merge record of what landed, and at that moment it described the previous head.

## The learning

When a declining verdict covers two repairs at once, its stated cost has to be true of each of them separately, or the cheaper repair is refused on the more expensive one's price. The bundling is what hides it: one sentence naming one cost reads as settled even when the two acts differ in kind. Acts on a change's DESCRIPTION — its title, its body, its labels, a comment — are a different class from acts on its CONTENT, and only the second class mints a new revision to be re-reviewed; a bound on review rounds constrains the second class and says nothing about the first. So a reviewer at a spent bound still has the description available to it, and a finding about the record rather than about the code is exactly the one that should still be actionable there. Before accepting a decline, check whether its cost claim distributes over everything it declines.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
