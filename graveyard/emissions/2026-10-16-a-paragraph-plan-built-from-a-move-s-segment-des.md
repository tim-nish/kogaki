<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-16
repo: Kogaki
grain: lesson

## Trigger — what happened

The first complete Leg Proof Sheet run (corpus/p1329, attack-defense-leg1, 2026-10-15) produced Japanese prose far harder to read than the original paragraph, though every Segment was in place.

## The learning

The Extractor describes each sentence by what it does to the reader (for example 'switches the reader from argument to definition', 'closes the pair so no third case is left open'). Those descriptions are stored in the Move's segments. The paragraph planner then takes each segment description as a point the paragraph must make, and the Writer dutifully writes a sentence stating it. So the generated paragraph contains sentences that describe the original's technique ('below I give these as definitions rather than argue them', 'no third position remains') which the original never said. The content of the paragraph arrives only through the one claim line, so the plan is four restatements of effect wrapped around one fact. Added to that, a Brief field that names where a term comes from becomes a sentence of provenance in the prose, and an Audience register that forbids short-sentence runs converts a two-line definition list into long compound sentences. The difficulty therefore comes from three places outside the Segments: effect descriptions treated as content, Brief metadata treated as content, and a register that contradicts the original's shape. A planner should draw points from the claims and use the Move only to order and shape them.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
