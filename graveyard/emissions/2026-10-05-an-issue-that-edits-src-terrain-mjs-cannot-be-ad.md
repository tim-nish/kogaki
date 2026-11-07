<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1271 on 2026-10-05: admit-issue verdict refused the plan because the cell read 297k tokens against a 140k worker window

## The learning

src/terrain.mjs is about 659KB, which the admission window guard prices at roughly 220k tokens on its own. That is more than the whole 140k a worker has for reading files, so no way of splitting the plan can produce a worker-sized cell that includes it. In this repository any Issue that has to change src/terrain.mjs can only be carried by the session itself: the owner starts the run with --session, or the lane declaration routes such cells to the session. Without one of those, the run stops at admission before any code is written, and no close can be recorded for it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
