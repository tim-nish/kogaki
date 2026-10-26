<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1387 (2026-10-15), a change to src/draft.mjs's Writer spawn, CI's registered-check run failed only on check-brief-reader-path-job case (b2): the fake judge died parsing an empty answer instead of the malformed answer being classified and respawned. Master was green at the base, the diff touched none of that code, and re-running the failed job passed with nothing changed.

## The learning

Case (b2) of the brief-reader-path-job check is timing-sensitive in CI: its fake judge can read an empty answer and die before the malformed-output path is exercised. A single red result on that case, under a change that does not touch the detached-job supervisor, should be re-run once before being read as a regression; a second red at the same head is a real failure.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
