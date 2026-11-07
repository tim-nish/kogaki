<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-26
repo: Kogaki
grain: lesson

## Trigger — what happened

The 2026-10-26 one-Leg Proof Sheet rebuild (leg-run-2026-10-25T21-30-09-612Z, qualify-dilemma-leg3) passed extract, ingest, brief and paragraph-plan and stopped at the Writer, which refused: Waypoints 2.3 and 2.4 and the Leg 2 Claim say 'one particular country', 'two of the countries' and 'the strongest one', definite references the Packet never resolves. The Extractor had written those Segment content clauses in the general register that the rules reserve for operation, relation and manner; the prior run's Extraction of the same paragraph named Russia, China and the United States.

## The learning

The extraction rules say the content clause and the opening are the only fields bound to the source, but the validator checks only the inverse direction: it refuses a subject noun inside operation, relation or manner and never notices a content clause that has gone general. A content clause written as a half-anonymised definite description ('the strongest one') is copied verbatim by the Brief composer into the Claim and by the Planner into the Paragraph Waypoints, so the first check that sees the missing referent is the Writer, four stages and some fifteen minutes later. A field declared source-bound owes a check that it stays bound, for example that each content clause's definite noun phrases resolve to a subject noun or to words of the passage; without one, run-to-run variance in the Extractor is caught only by the most expensive stage. Repair route today: edit the content clauses on the run's Extraction YAML and rerun with --reuse --from brief, which records the edit.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
