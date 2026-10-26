<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1567 (2026-10-24), CI's registered-check run failed twice at one head on check-brief-reader-path-job case (b3), the fake judge dying with 'Unexpected end of JSON input' inside nthCall, and passed on the third attempt with nothing changed. Master was green at the base and the diff touched no detached-job code.

## The learning

The fake judge in checks/fixtures/brief-reader-path-job/fixtures.mjs counts calls per token in one shared file with an unlocked read, increment and rewrite. The bad, nolegs and good units run at the same time, so one process can read the file while another has just truncated it, and parsing the empty text kills that unit before the case it tests runs. The earlier rule of thumb, that a second red at one head is a real failure, does not hold for this check: the failure is a race in the fixture, and it can repeat at the same head. The fix is in the fixture (write the counter to a temporary file and rename it, or keep one counter file per token), not in the change under review.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
