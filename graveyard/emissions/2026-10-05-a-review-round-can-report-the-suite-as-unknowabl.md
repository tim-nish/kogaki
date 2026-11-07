<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki PR #1264 round 1 (2026-10-05): the review engine's own run of tools/run-registered-checks.sh failed to start with 'argument --timeout: invalid int value: 7200.0', so the report listed the registered suite as cannot-determine, while the CI job 'Run every registered check' passed the same head in 24s.

## The learning

When a review report says the suite could not be run, check the pull request's CI jobs before treating the suite as unverified. The review engine passes its check timeout as a decimal number, and the check runner accepts only whole numbers, so every round in this repository fails to start the suite and says so. CI runs the same registered suite on its own, so CI is the evidence for that head until the engine passes a whole number.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
