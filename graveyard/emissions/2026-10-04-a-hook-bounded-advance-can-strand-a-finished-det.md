<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A /brief run's hook advance was cut at its 480-second limit while the reader-path job it had launched kept running and finished; the run record still said it was waiting on that step.

## The learning

When a step's work is handed to a process that outlives the hook that started it, the hook's time limit no longer bounds the work, only the bookkeeping. The run can look stuck while its results sit finished on disk. The way out is a resume act that reads the finished job and continues from it, not a retry that redoes the work. Check whether the job finished before you treat a stalled run as failed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
