<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1368 and #1375, 2026-10-14: a design discussion that began with the Proof Sheet found Move information back in the Brief and the Packet, and the owner settled the paragraph level of the pipeline.

## The learning

Decisions the owner made on 2026-10-14, in their words where given. (1) ContentClause and GeneralizedClause are official terms: a Segment's clause about the original's content, and the same clause with no subject. (2) A Waypoint is what one Leg or one paragraph must say about the article's subject: its Segments made concrete with the claims of its Strands, under the Persona. The name is used at both scales, as Leg Waypoint and Paragraph Waypoint. (3) The Composer generates Paragraph Waypoints after Leg Waypoints, through the same kind of feedback loop, with the count free by the same rule; its inputs are the Leg Waypoint, the Claims its serves names, the paragraph Move and the Audience's persona; the Packet reads the register. (4) Paragraph Waypoint generation is its own stage after the Brief, named ParagraphPlan (command /paragraph-plan), writing a separate file that names the Brief it came from; the Brief names nothing downstream. (5) Move information may be used up to Paragraph Waypoint generation and nowhere after it. (6) ParagraphPlan is not Reiter and Dale's microplanning: it refines the document plan to paragraphs, and word choice, reference and sentence shape stay in the one Writer call; so the claim that Kogaki adopts only the document-plan boundary stands. (7) The Proof Sheet uses one Leg Waypoint per card, taken from the original paragraph and serving one Claim, then the production commands from /paragraph-plan through /draft; Brief-to-Draft cells on the left, Move cells on the right, and no margin boxes. (8) Segment functions (raises, advances, settles) were removed from what the Proof Sheet's Writer reads, as the first revision. (9) Retries keep the Brief's rule: call_limit_s per call and unit_attempts per unit, and call_limit_s stays because it is the only stop for a call that hangs.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
