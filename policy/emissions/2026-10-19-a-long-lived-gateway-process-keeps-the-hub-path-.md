<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-19 the hub checkout was renamed from product-lab to gukan and the operator config was updated, but this session's gateway tool, started earlier, still failed every call with 'cannot resolve hub HEAD at /home/tomoya/work/product-lab'. The kit's own client, policy/kit/bin/gateway-query.mjs, starts a fresh gateway per call and read the renamed hub correctly, so the consult receipt for kogaki#1460 was emitted through it.

## The learning

A gateway that reads its configuration once at start keeps serving the old hub location after a rename, so a failing consult in a long-running session can be a stale process rather than a broken hub. Retry through a client that starts its own gateway before concluding the policy source is unavailable.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
