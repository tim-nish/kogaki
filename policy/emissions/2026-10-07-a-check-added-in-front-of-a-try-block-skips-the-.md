<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1300, PR #1304: both advance hooks gained a read of the table's advance bound with an early return when it was missing. The read sat above the try whose finally block delivers an open gate and any refusal to the session, so a table with no bound returned past the delivery. The hook-invocation check caught it, through six cases that went silent.

## The learning

When a hook or command has one place where every exit delivers its output, usually a finally block, a new guard that can end the run must sit inside that block's try, not above it. Put above it, the guard's own early exit quietly skips the delivery, and the person waiting for the output gets silence instead of a reason. Before adding an early return, find where the output is delivered and check that the new exit still passes through it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
