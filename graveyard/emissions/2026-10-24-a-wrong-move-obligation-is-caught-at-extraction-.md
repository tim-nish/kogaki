<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

Clarifying what the Proof Sheet can test about a Move's authored obligation field (kogaki#1557/#1558), reading src/proof-sheet/leg-brief.mjs deferredTermRows and extract.mjs obligationRefusals on 2026-10-24.

## The learning

The Proof Sheet fixes Passage and Moves before it runs, so an Obligation cannot change what is built; it can only be kept or not. Three readers see a wrong one. The Extractor refuses an obligation whose item a Segment's content clause already defines, and the Move adapter refuses an item no word of the after state names. The Leg Brief composer is mechanical: a term slot whose terms no later Leg introduces raises no row and is shown as 'N deferred, 0 kept' rather than failing, and a question slot raises no row at all. Only the ParagraphPlan judge (OWE) and the Brief's discharge judgment turn an unkeepable promise into a reported failure. So the sheet's answer to 'is this Obligation right?' lives in the judge verdicts and the deferral line, not in a composer refusal.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
