<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1342 the review run reported a red check suite at two heads, and the failing lines were lost both times: a later local run of the same checks wrote its own result to the same file, keyed only by the commit.

## The learning

When two different runners write their result for the same commit to one file, the later one silently replaces the earlier, and the earlier may be the only red result anyone saw. Read and keep the reviewer's failing output before running anything locally at that commit, and a result store should key on who ran it as well as on what it ran over.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
