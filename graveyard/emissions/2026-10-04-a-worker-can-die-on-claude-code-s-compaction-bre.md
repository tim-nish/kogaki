<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1251 in kogaki on 2026-10-04: the 1251-worker (claude-sonnet-5, budget 260 turns) ended at exit 1 after 49 turns and 14.3 minutes with terminal_reason rapid_refill_breaker and api_error autocompact_thrashing — its context refilled to the limit within three turns of each compaction, three times running. It had no permission denials and committed nothing but the supervisor's consult-receipt commit. The worker reap graded the stop stage-refused with the correction routed to infrastructure.

## The learning

A kogaki worker has a second way to die that the refusal bound does not explain: when a seven-part Issue spanning several large source files is handed to one worker, its reads fill the context faster than compaction can clear it, and Claude Code itself stops the session. The log's last JSON line says so (terminal_reason rapid_refill_breaker); the worker-status line only says exit 1. Because no work lands, the plan is unchanged and the same dispatch would die the same way — the correction is a smaller plan cell per dispatch (one numbered remedy item, or one source file, per cell) or a worker reading in bounded windows, not a retry.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
