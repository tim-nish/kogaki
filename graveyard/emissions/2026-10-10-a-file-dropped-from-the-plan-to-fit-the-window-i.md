<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-10
repo: Kogaki
grain: lesson

## Trigger — what happened

ship-cycle 1319: admission refused the plan as too large for the worker's window, so the session dropped checks/registry.json from files=; the worker added four check cases, raised the registry's case_floor anyway without the matching runtime_ms_note entry, and the suite refused the commit on registry-conformance.

## The learning

When a plan is too big for the worker, narrow a file to the lines that change rather than removing it. A file the work must change still gets changed when it is left out of the plan, but the worker is then editing without the rules that come with it, and a check catches the edit only after the whole worker run has been spent. For a check registry, adding cases means raising the case floor, and raising the floor needs its own runtime note, so the registry entry has to be in the plan whenever cases are added.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
