<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A decision split one piece of work across two systems: the part this team could enforce stayed here and shipped, and the part that had to live in another team's tooling was handed over. The handover command, run for the second part, automatically marked the whole item as waiting on the other team — it wrote a banner saying so, set a flag that removed the item from the working queue, and replaced the record of what had just been decided with a pointer to the other team. All three were wrong, because half the work was live and shipping here. Nothing detected it; it was noticed only because the same session had written the record moments earlier and saw the text change.

## The learning

A hand-over act that also marks the source as waiting is assuming the whole item moved, and that assumption is invisible because the common case makes it true. Where a decision splits work across a boundary — some here, some there — the hand-over is not the item's disposition, it is one event in its life, and an act that overwrites the disposition destroys the record of the decision that produced the split. Two things follow. Give the act a way to say 'part of this moved', or have it append to the record rather than replace it, so the split survives. And treat a wait-marker as a claim about standing that something must be entitled to make: an act that cannot know whether the source still holds live work is not entitled to assert that it is waiting. The tell is that the wrong state reads as tidy — a parked item with a pointer to another team looks exactly like correct bookkeeping, which is why nobody re-reads it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
