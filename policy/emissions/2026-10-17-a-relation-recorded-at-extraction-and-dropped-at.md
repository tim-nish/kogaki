<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

Comparing a Proof Sheet Draft with its source Passage: every connective between paragraphs (on the other hand, therefore, since this is complicated) was gone. The Audience register was blamed first, but the two runs' Writer prompts carried identical register text. Tracing showed the Extractor recorded each paragraph's relation to its predecessor at Segment 1, the ingest copied it into the Move, the ParagraphPlan generator was handed it and wrote bare points, and the Packet rendered only points.

## The learning

When a quality is missing from a model's output, trace what the model was actually handed before adjusting the rules it was given. A fact can be captured upstream, survive two copies, and be silently dropped by the stage that reshapes it, so the final prompt never carries it. The rule layer then looks responsible because it is the layer a reader sees, and tightening or loosening it changes nothing. Diff the final prompts across runs first: identical instructions with different outputs point at the inputs, not the rules.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
