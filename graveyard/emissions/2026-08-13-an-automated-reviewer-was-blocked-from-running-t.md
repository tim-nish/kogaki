<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

An automated reviewer was blocked from running the one command that would have independently confirmed a change's central claim. The program that launched the reviewer noticed the block and recorded the session as degraded in its own log. The reviewer's published report, which is what everyone actually reads, said instead that nothing was undeterminable and that both of its dimensions were fully readable — it had confirmed the claim by reading the change rather than by running it, and did not say so. An earlier occurrence of the same block had produced no report at all, which was impossible to miss.

## The learning

A degradation recorded by the launcher and absent from the report is worse than one that stops the report entirely, because the loud failure gets fixed and the quiet one gets believed. The reader of a report has no access to the launcher's log, so a report that omits what it could not do is indistinguishable from one that could do everything — and reading a change is not the same evidence as running it, however careful the reading. When a reviewing process can be denied a capability partway through, the denial belongs in the artifact the reviewer publishes, not only in the operational log of whatever spawned it. Treat any improvement that converts a total failure into a partial one as incomplete until the partiality is visible at the surface a human reads; otherwise the fix has traded a stoppage for a false clean bill.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
