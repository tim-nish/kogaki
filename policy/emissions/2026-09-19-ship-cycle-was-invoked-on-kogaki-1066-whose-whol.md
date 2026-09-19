<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle was invoked on kogaki#1066, whose whole deliverable is an owner observation made inside a live /terrain run. A PreToolUse deny landed the day before (kogaki#1154) refuses dispatching terrain or brief while a ship-cycle run marker exists, so the run's only discharging act was unreachable from inside it — the second run in two days to stop on this issue, the first by deadlocking on the same pair of hooks.

## The learning

An orchestrator cannot ship a deliverable that only exists outside it. When a task's acceptance is an act the driving process is refused — an owner's click inside a skill that opens its own gate interval — the work is not blocked, slow or under-specified; it is sited in a different session, and no amount of re-running the driver moves it. The tell is a guard that names the recovery in its own refusal text: a refusal that says where the act belongs is describing the task's territory, not an obstacle on the way to it. Routing such an issue into the batch driver costs a run each time, so the siting belongs on the issue at admission rather than being rediscovered at dispatch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
