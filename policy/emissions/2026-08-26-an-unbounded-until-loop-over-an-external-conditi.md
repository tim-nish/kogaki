<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run waited for CI on a pushed head with 'until <run exists for this sha>; do sleep 45; done' under a 25-minute tool timeout. GitHub created no run for that sha at all — the webhook was never delivered — so the condition could never become true. The watcher sat producing nothing, and its silence was indistinguishable from a slow CI queue. The operator asked whether it had stalled; a direct query showed the run for the PREVIOUS head had been cancelled and no run existed for the current one. The loop had been running roughly thirty minutes over a question that was already decided.

## The learning

A wait loop over an external condition encodes an assumption that the condition is still PENDING, and it has no way to notice that the condition became UNREACHABLE instead. The two states produce identical observations — no output, no exit — so the watcher reports 'not yet' forever for something that will never happen, and every minute of its silence reads as evidence the wait is working. The fix is not a better predicate; it is a BOUND. An iteration cap converts an unreachable condition into an exit with a count, which is a fact a reader can act on: 'twenty-four checks over six minutes, still absent' distinguishes a lost trigger from a busy queue, and the bare absence never does. Two riders that are cheap and not obvious. A tool-level timeout is NOT the bound — it kills the loop without emitting the count, so the caller learns only that time passed. And the loop should print what it observed on exit even when it gives up, because the give-up path is exactly the one whose evidence matters; a loop that returns nothing on failure has spent its whole run producing no observation at all. The general form is the silence family read from the CONSUMER side: where a producer emits no completion event, the remedy is a producer-declared terminal state — and where the consumer cannot get one, its own bounded give-up IS that declared state.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
