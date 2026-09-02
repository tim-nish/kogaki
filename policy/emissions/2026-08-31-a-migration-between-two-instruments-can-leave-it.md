<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-31
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#635 counts its closed set with one regex and resolves the new form with another: a bare file-colon-line pointer is counted, and an anchor is resolved ONLY when it appears wrapped in backticks. A drain pass rewrote nineteen JSON fixture pointers into the anchor form without those backticks. The count fell from 88 to 69 exactly as the pass predicted, the whole suite stayed green, and the resolver still reported zero anchors resolving — nineteen pointers had left the population being counted and entered no population being verified. The number meant to evidence the work was the number that hid its failure, because the count measures departure from the old form and says nothing about arrival at the new one.

## The learning

Where a migration is watched by a counter of the OLD form and a resolver of the NEW form, the two instruments share no state, so a rewrite that lands between their patterns satisfies the counter and is invisible to the resolver. The counter goes down, which is the very evidence the migration is judged by, and every downstream surface reports success. The general shape: a count of what REMAINS is not evidence about what was PRODUCED, and reading a falling remainder as progress assumes a conservation that neither instrument enforces. Two consequences follow. A migration states BOTH numbers in its acceptance — what left the old population and what arrived in the new one — because either alone is satisfiable by dropping items on the floor; the honest reading here is nineteen resolving AND sixty-nine remaining, and sixty-nine remaining was true throughout the broken state. And the arrival number is read from the instrument own source rather than assumed: the resolver pattern was the thing to look at, and it named the backtick requirement in a single line that no amount of staring at the count could reveal. The tell separating this from ordinary incompleteness is that NOTHING FAILED. A partial migration usually leaves a red check somewhere; this one left green everywhere, which is what a conservation violation looks like when both instruments are individually correct.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
