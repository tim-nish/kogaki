<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1284, 2026-10-07: the worker added four cases to checks/move_ingest_cases.py and raised the move-ingest case_floor in checks/registry.json, a file the admitted footprint did not name; registry-conformance then refused the raise because no license entry and no fresh runtime_ms_note accompanied it, and the run ended suite-failed

## The learning

Adding cases to an existing kogaki check is not a change to the case file alone. The registry's case_floor for that member has to rise with the new cases, and every raise owes two entries in checks/registry.json in the same commit: the admitting issue appended to the member's license, and a new runtime_ms_note. So a plan cell that adds check cases must list checks/registry.json in its files and registry-conformance in its checks, or the worker raises the floor half-way and the suite refuses it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
