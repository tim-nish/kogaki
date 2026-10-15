<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: topic-line

## Trigger — what happened

Owner and session settled the Proof Sheet's architectural boundary on 2026-10-15 after three revisions of the sheet (kogaki#1348, #1368) and a review of the P2, P4 and P7 cards.

## The learning

The Proof Sheet began as a testing problem: take one small paragraph, extract a Move from it, and check in a lightweight environment of mocks and fixtures whether the Move could regenerate the paragraph. Three things broke that framing. First, a paragraph Move does not operate alone: the stages that read it (binding, Paragraph Waypoint generation, the judge, the Packet, the Writer) each carry rules a small controlled world cannot represent without reimplementing them, so the experiment switched to running the production executables. Second, once the production executables were in use, the paragraph was the wrong unit: a paragraph cut out of its Leg loses the earlier paragraphs' prose and introduced terms, and the Writer correctly refuses a point it is not allowed to assert (card P2). The Leg is the smallest unit the production commands can write whole. Third, the production Brief composer cannot be fed an original text: its material is served Strands, and turning original prose into artificial Strands would distort what a Strand means and what it may cite. So the boundary is: the Proof Sheet takes one original Leg as input, builds its Brief from the Leg's own Extractions through experiment-owned prompt rows that copy the production rows one diff away, and hands the Brief to the production ParagraphPlan and Draft commands unchanged. The production Composer sits outside. The object evaluated is the paragraph Moves and the Audience against the original prose; the goal is not to reproduce the original Leg but to reconstruct ideal Leg information from it and test the Moves against that. The lesson for the design of any evaluation harness over a pipeline with rich stage contracts: a mock world is cheap only while the thing under test has few readers; once its readers are the pipeline itself, share the executables and move the boundary to the smallest unit they can process whole.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
