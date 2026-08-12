<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

After three rounds of orphaned line-wraps, the stated fix became 'reflow the whole paragraph, not the line'. The next fix did reflow paragraphs — bounded by the diff's changed region rather than by the file's blank lines — and the orphan relocated to just outside that boundary. Fourth instance of the same shape, produced by correctly applying the lesson the first three taught.

## The learning

When a lesson says to operate on a larger unit, the unit has to be the one the artifact defines, not the one your tooling is showing you. A diff's changed region looks like a natural boundary while you are working in it and has no relationship to where a paragraph, a function or a section actually ends — so a fix scoped to it reproduces the original defect one line past the edge. The tell is a repair that satisfies its own stated rule and fails anyway: check whether the rule named a unit and whether you took that unit from the document or from the view you happened to be reading it through.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
