<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1273 was started without --session. The Issue body says src/terrain.mjs is too large for a worker and asks for /ship-cycle 1273 --session. admit-issue verdict refused the plan cell twice: first over the 200-tool-call ceiling, then, with the file list trimmed, for 358k tokens of files against a worker window of 140k.

## The learning

The choice to implement in the current session is read only from the launch argument. A run started without --session cannot make it, however plainly the Issue body asks for it, so the run stops at admission. record-pass has nothing it can read for that stop, so the close cannot be rendered. Before launching, check the Issue's 'How this lands' line and pass --session when it asks for it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
