<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A rendering was moved from its own surface into a section of a larger document. The larger document's rule that rejects unrecognised lines was already inert there, because three of its existing line kinds accept any text at all. The moved rendering's own line kinds are tightly specified, but a malformed one falls through to a catch-all kind and is accepted anyway.

## The learning

When a strict list is widened to admit new members, check whether the list's enforcement is already switched off by the members it started with. An exemption that some original member genuinely needed is inherited by every member added later, including ones that could never justify it, and nothing announces the inheritance: no error, no warning, no failing test. The tell is that the new members look constrained on paper while the check that would enforce them cannot fire, so a reader inspecting the written contract concludes it is enforced and a reader running the tool never finds out otherwise. Re-derive the exemption at the moment of widening rather than at the moment something breaks, and if it cannot be withdrawn in that sitting, write down that it was inherited and not repaired -- an undisclosed inherited exemption is indistinguishable from coverage.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
