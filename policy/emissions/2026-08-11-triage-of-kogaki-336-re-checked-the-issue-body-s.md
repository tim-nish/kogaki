<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Triage of kogaki#336 re-checked the issue body's own embedded policy cite against the served surface at the current pin.

## The learning

An issue body that quotes a policy line by file:line, without a pin, goes stale silently. kogaki#336 cites topics/knowledge-architecture.md:31 for the rule that a field read by both sides belongs to the boundary; at the current served pin that rule sits at :50, and :31 now holds different text. Nothing detected the drift, because a quote in an issue body is not a consultation — no receipt was ever emitted for it, so no staleness machinery has anything to re-check. The issue was still right; it was right by luck of a re-read rather than by any mechanism. The practical consequence is that a cite in a durable carrier owes its pin at authoring, exactly as a receipt does, or it is a pointer that quietly stops resolving to what it claimed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
