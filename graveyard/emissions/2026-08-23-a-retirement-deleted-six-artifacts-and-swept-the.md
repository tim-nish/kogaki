<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-23
repo: Kogaki
grain: lesson

## Trigger — what happened

A retirement deleted six artifacts and swept the tree for references by grepping the deleted paths with their line numbers. A later review found a live reference the grep could never have matched: a CI env block naming the artifact as 'review-report' where every other pointer wrote 'check-review-report.sh'. The sweep had been widened once already and would not have reached it at any width.

## The learning

A sweep keyed on the string you deleted finds only the references that spell it your way, and the ones that do not are invisible in a manner no widening repairs — because the miss is not a narrower pattern, it is a different name for the same thing. Artifacts accumulate aliases as a matter of ordinary prose: a check is named by its file, by its id, by the property it asserts, by the issue that installed it, and each alias is the natural one at its own site. So the residue set after a deletion is not derived from the deleted PATH; it is derived from the deleted artifact's REFERENCE GRAPH — every token the thing is known by, crossed with every file mentioning any of them — and that set is computable before the deletion, when the artifact is still there to be interrogated for its own names. The tell that you are on the wrong side is a sweep that has already been widened once: widening is what you do when the pattern is nearly right, and an alias miss is not nearly right.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
