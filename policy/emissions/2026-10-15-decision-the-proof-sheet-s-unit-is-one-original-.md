<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: topic-line

## Trigger — what happened

Owner decision 2026-10-15 on the Proof Sheet (kogaki#1368), closing the question of whether it stays a paragraph-level playground or becomes a Leg-level reproduction tool.

## The learning

Decision (owner, 2026-10-15). The Proof Sheet's input unit is one original Leg: N consecutive paragraphs of a source text plus the Audience file. Inside the boundary are: a fixed Extractor prompt per paragraph; the ingest that derives one paragraph Move per Extraction; a Leg Brief composer owned by the experiment, whose rows copy the production reader-start and Leg-composition rows with the Extractions standing in for Strands, writing a Brief with one Leg and one Leg Waypoint per paragraph; and the Proof Sheet itself. Outside the boundary, used unchanged: the production ParagraphPlan and Draft commands. Also outside, never run on experiment material: the production Brief composer, because its material is served Strands and original prose must not be turned into artificial Strands. The Brief is schema-complete and content-minimal: the fields the two production commands read are composed, the fields the parser requires but no stage reads are constants. The evaluation target is the paragraph Moves and the Audience; closeness of the written Leg to the original is the proxy KPI, structure (Segment order, breaks survived) is what the sheet scores, and reproducing the original Leg is not the objective. Reader state never enters a Packet and never enters the crossing block; it reaches planning through the Brief only.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
