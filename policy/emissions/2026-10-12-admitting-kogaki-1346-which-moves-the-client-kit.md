<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

Admitting kogaki#1346, which moves the client kit out of Kogaki into a new private repository and removes the in-tree copy

## The learning

When code that a repository's own checks run is moved into a private repository, the plan has to say how the CI job gets that code back. The CI runner has only this repository's checkout and a token scoped to it, so it cannot clone the private one. A local run looks fine because the installed copy is on disk, so the gap shows up only in CI.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
