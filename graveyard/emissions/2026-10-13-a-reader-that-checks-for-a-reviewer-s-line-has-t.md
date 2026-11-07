<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1367: PR #1372 merged after a clean review whose report said 'D1 — unbuilt: none.' on its own line, yet the close was refused as if the report said nothing, and the run had to be recorded as a failure.

## The learning

The close step looks for a line beginning with the word 'unbuilt'. This repository's reviewers put 'D1 — ' in front of every verdict line, so the check never finds it and refuses a correct close. Once the pull request has merged, no new review round can be run, so nothing can repair it. A check that reads text someone else writes has to be tested against what that writer really produces, not against the form the check's author expected.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
