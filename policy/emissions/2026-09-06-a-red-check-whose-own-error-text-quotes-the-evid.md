<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A PR was blocked by one red check. Its failure line printed the captured output as evidence — and that output plainly contained the exact string the assertion said it could not find. The same commit had been green on an earlier run, and the check passed locally.

## The learning

When a failure message quotes text that satisfies the very condition it reports as unmet, the assertion is not describing the state of the code — the check itself is nondeterministic. Read the quoted evidence before treating a red check as a finding, and before hunting for a cause in the change under review. Here the check was unrelated to every file the change touched, and a plain re-run at the same commit went green: the change was never implicated. The cheap discriminator is a re-run at the SAME commit — it costs nothing, moves no head, and separates a flaky instrument from a real regression before anyone spends a round on it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
