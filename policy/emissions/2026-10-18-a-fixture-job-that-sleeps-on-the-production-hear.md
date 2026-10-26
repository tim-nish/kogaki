<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Asked whether Kogaki's check suite had slowed. CI's registry-driven job went from a 32s median step in late September to 116s this week; a forced serial local run read 802s against 453s of declared runtime. Five members added between 2026-09-25 and 2026-10-15 (brief-reader-path-job, paragraph-plan, proof-sheet-extract, proof-sheet-leg-brief, proof-sheet-leg-run) account for 740s of it, and their own notes say the time is the detached-job supervisor's 10-second heartbeat across fixture jobs whose fake judge answers at once. proof-sheet-leg-run's declared 97s had drifted to a measured 309s after two retry/resume features added more fixture jobs without re-measuring.

## The learning

When a check drives a job supervisor through fixtures, the fixture must set the heartbeat, not inherit the production one: a fake model that answers instantly still waits a full heartbeat per poll, so each added fixture job or attempt adds whole idle heartbeats to every run of the suite, and the slowest such member sets the suite's wall time no matter how many jobs run in parallel. brief-reader-path-job already does this (heartbeat 100-250ms, fixture-supplied bounds) and is the pattern. Two things follow: declared runtimes drift silently when a feature adds fixture jobs, so a check whose cost is heartbeat-shaped should state its job and attempt count beside the figure; and the registry's tier field is declared but the runner never reads it, so a slow member cannot be moved out of the edit loop by declaration alone.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
