<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #984 round 1 found a names table under-recording its file and asserted two of its rows named things absent from the file. The round-1 fix regenerated the table from the one field set the reviewer had cited, which added twenty-one correct rows and deleted the two — both names were real, cited in prose fields the generating read did not cover. Round 2 caught it, and round 2 was the last round: had the narrowing been one round later there would have been no round left to see it.

## The learning

A repair for 'this was derived from too little' is itself a derivation, and the natural fix — generate it from the input the finding named — inherits exactly the defect it is repairing, because the finding named a symptom's location rather than the input's full extent. The repair also looks stronger than the original: it covers more, so the coverage it silently drops reads as a rounding error against the rows it added. Two consequences worth acting on. Where a finding says a derived artifact is incomplete, establish the artifact's full source surface before regenerating, not the surface the finding happened to cite. And a repair of this shape landing in a review's LAST round is the dangerous case, because the instrument that would catch the re-narrowing is the round that no longer exists — so a fix that changes HOW something is derived, rather than fixing a value, is worth spending an earlier round on.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
