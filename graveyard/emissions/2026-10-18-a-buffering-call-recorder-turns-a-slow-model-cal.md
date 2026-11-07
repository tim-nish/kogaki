<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-18 a Proof Sheet Leg run (src/proof-sheet/leg-run.mjs) stopped at paragraph-plan with 'the job ended stalled' after 1 attempt. The extract, ingest and brief stages had succeeded and the plan call had produced a full candidate; the fit judge call was killed at 0 bytes. The run's call recorder relays each model call with spawnSync and writes the whole answer once the call ends, while the ParagraphPlan job reads no byte growth on a unit for 90 seconds (stall_s in src/paragraph-plan-workflow.json) as a stall. The plan call took 70 seconds and passed; the fit call ran past 90 and was read as stalled. The 2026-10-16 run needed two attempts on the same Leg for the same reason.

## The learning

A watcher that reads liveness from output growth and a wrapper that buffers that output until the call ends cannot share a run: every call longer than the stall bound is killed as stalled, however healthy, and a shorter call passes by luck. Whether a run gets through depends on model latency that day, not on the code. Either the relay streams bytes as they arrive, or the stall watcher reads a heartbeat the wrapper cannot hide, or the two are never placed on the same path. A test with a fast fake model never sees this.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
