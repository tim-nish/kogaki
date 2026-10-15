<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki#1375 the admission step refused the plan because one piece of work had to read a file that nearly fills a worker's whole reading budget. The run then could not record how it ended: both the recording step and the closing screen refused, because the refusal left no row behind.

## The learning

When admission refuses a plan for being too large to read, it should leave a row saying so, the same way its stop for an owner decision does. Without that row the run cannot close in the normal way, and the only honest report is a plain note naming the session launch as the way forward.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
