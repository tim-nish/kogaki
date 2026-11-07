<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1394 (2026-10-15): the Issue re-cut the Leg sheet's code and its check, and also the provenance map, which lives in the ignored corpus folder no worker can see.

## The learning

When a change's only ignored-file edit is a table that must match names the code defines, the code can still go to a worker: admit only the tracked files, merge, then the session updates the ignored file on the owner's machine against the merged names and runs the check that compares the two. The check skips the comparison where the ignored file is missing, so the worker and CI stay green, and the comparison runs where the file exists. Name the follow-on in the pull request so the reviewer reads it as planned rather than missing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
