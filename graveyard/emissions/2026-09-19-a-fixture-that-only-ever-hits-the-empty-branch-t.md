<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A new reader function was merged with a check suite green. Its section regex used the multiline flag, where $ matches at every line end, so the lazy capture stopped at the first newline and the function returned an empty list for every input it was ever given. Nothing noticed, because every fixture in the tree handed it an input that was SUPPOSED to produce an empty result — so the branch under test and the broken branch produced the same observation.

## The learning

When a function returns a collection, a test that only ever exercises the empty case cannot tell a correct function from one that always returns empty. The two are indistinguishable at the assertion. So a reader is only covered once some case hands it input that MUST produce a non-empty result, and the empty case is asserted BESIDE it rather than alone — the pair is what discriminates, because a reader that returned everything would pass the non-empty assertion and a reader that returned nothing would pass the empty one. The same asymmetry hides in any predicate whose failure mode is its default answer.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
