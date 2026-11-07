<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

A new case pushed a check file 41 lines past the repository's file-length limit, and the exemption list for that limit may only shrink.

## The learning

When a new test case would push a check file past the length limit, fold the new case's fake inputs into an existing fixture, driven by a small switch, instead of copying a near-duplicate fixture. The case keeps its own assertions, the file stays under the limit, and nothing is added to the exemption list.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
