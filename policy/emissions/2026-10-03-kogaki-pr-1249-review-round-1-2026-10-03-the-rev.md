<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-03
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki PR #1249 review round 1, 2026-10-03: the reviewer's declared check runner failed with 'argument --timeout: invalid int value: 7200.0', so the round ran no checks and still landed clean with 0 findings

## The learning

The review round calls the repository's check runner with a timeout written as a decimal number (7200.0), and kogaki's runner accepts only whole numbers, so it refuses before running anything. The round does not stop: it records that it could not determine the check results and still lands with zero findings. So a clean review at this head says nothing about whether the checks pass, and only the pull request's own CI run shows that. Until the caller passes a whole number, every round in this repository reviews without check results.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
