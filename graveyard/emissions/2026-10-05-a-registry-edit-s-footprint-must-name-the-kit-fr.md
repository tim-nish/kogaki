<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1269 (carrying #1246) on 2026-10-05: the worker added covers to all 37 entries of checks/registry.json and the registry-fragment check failed on five of them, because those five are copies of policy/kit/registry-entries.json and the plan's files= list named only the registry and its conformance check.

## The learning

When a change adds a field to every entry of a registry, check first whether some entries are copies of another file that the repository treats as their source. Here five check entries are copied from the kit's own entry list, and a check refuses any copy that disagrees with that list. A plan that names only the registry cannot pass: the source file has to be in the footprint too, and edited first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
