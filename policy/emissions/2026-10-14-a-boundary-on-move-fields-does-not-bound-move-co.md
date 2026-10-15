<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

Investigating the kogaki#1368 ParagraphPlan Proof Sheet (card P4): seven Segments produced one Paragraph Waypoint, and the written paragraph read like a summary of the original. The Writer transcripts showed no tool use and the Packet carried no Move field, yet the paragraph's whole content had reached the Writer.

## The learning

A rule that forbids a stage from passing a record's named fields (here: no Move id, Segment, before or after row past Paragraph Waypoint generation) does not stop that record's content from passing, when the generator reads the whole record and writes free text. The Move's after-state row was paraphrased into the one Paragraph Waypoint's point, which the Packet then carried verbatim. In a reproduction experiment where the Leg Waypoint, the Claim and the Move's after row are all authored from the same source paragraph, the Writer receives the answer three times under three labels, and the experiment measures nothing. Check content provenance by tracing sentences, not by checking field names; and when an experiment collapses two planning levels onto one unit (one paragraph = one Leg Waypoint), expect the lower level to produce one item and say nothing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
