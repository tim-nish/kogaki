<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-09
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1317 --session resumed a failed worker's wip commit; session-cell finish graded the pass implemented, then review round 1 found the registered suite red against master (registry-conformance failed on a new member's efficacy label).

## The learning

A session pass that starts on a commit someone else left behind is graded against that commit, not against the default branch. If the leftover commit already broke a check, the pass never sees it, because the check was red before the pass and is still red after. Before pushing, run the full suite against the default branch's tip, not against the pass's starting commit.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
