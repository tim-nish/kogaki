<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-23
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1175: admission would have routed it to implementation, but its schema was defined as the owner's answers to questions posted on its closed predecessor, and none had been answered.

## The learning

When an Issue's work is defined as the owner's answers to questions posted somewhere else, and those questions are still open, the Issue has nothing an implementer can build. Yet it passes admission, and GitHub records no dependency for it, because the thing it waits on is a set of answers, not an Issue. Before admitting such an Issue, check whether the questions it depends on have been answered. If they have not, the only Blocker the run can record names no Issue, and the useful move is to hold and get the answers first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
