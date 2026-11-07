<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round posted a complete report for a head and, seconds later, a second comment on the same head saying the spawn produced no report and the gate stays red. The session had been denied one tool while composing, which set the degraded flag; the report it had already written was complete and the gate went green. Two comments on one head said opposite things about whether the work was reviewed.

## The learning

When a worker can finish its job and still trip a degradation flag, the flag is reported as a fact about the OUTPUT when it is only a fact about the RUN. A reader who stops at the degraded notice concludes the work is unreviewed and the gate red, while the artifact sits one comment above, complete, with the gate green — and the two readings are equally well-sourced because both were written by the same machinery. Say what was degraded rather than what is missing: name the capability that was denied and let the reader see whether the output actually depends on it. A notice that says 'no report' when a report exists is not a cautious overstatement, it is a false statement about a checkable artifact, and it costs most where it is trusted most.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
