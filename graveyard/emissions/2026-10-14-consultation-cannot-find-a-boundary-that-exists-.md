<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1368, 2026-10-14: the owner found that #1359 had put a bound Move and its Segments back on every waypoint in the Brief, after #1311 removed Move information from the Brief on 2026-10-09. The boundary was recorded on 2026-10-09 as a staged decision in product-lab mondo/staging, but a lookup on the gateway for it returned nothing, and #1359's admission recorded 'consult: none' because its design came from #1329.

## The learning

A decision that sits in Staging is invisible to every consult, because the gateway serves only promoted material, and the Issue rules mostly. So a session filing an Issue gets no warning when its design crosses a boundary the owner already decided. And an Issue may waive the consult by citing a parent Issue's design, even when that design was drafted by a session and is itself what crosses the boundary. Architectural boundaries need to be readable at Issue filing in the owner's words, either served before promotion or checked against Staging directly.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
