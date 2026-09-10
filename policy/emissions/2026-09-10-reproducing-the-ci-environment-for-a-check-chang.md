<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

Reproducing the CI environment for a check change: the gateway variable was pointed at a missing path, and a registered member went red on the branch and on master alike.

## The learning

A dependency pointed at a missing path is not the same absence as a dependency not configured, and substituting one for the other manufactures a failure the change did not cause. Here the seam variable set to a nonexistent file made every install in a test file take its configured-gateway branch, so a case asserting exactly one registration counted three; unset, the same suite passed. The absence CI actually has is the one to reproduce, and the way to tell a manufactured failure from a real one is to run the same shape against the base branch before reading the result as a finding.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
