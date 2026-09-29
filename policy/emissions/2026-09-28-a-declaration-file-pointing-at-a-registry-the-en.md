<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217: spawn-implementer refused with 'checks/registry.json carries no tests list' minutes after a concurrent session committed .claude/checks.json naming checks/registry.json as the registry.

## The learning

Naming an existing file in a declaration is not the same as the engine being able to read it. kogaki's check registry keeps its entries under a 'checks' key, while the dispatch engine reads a 'tests' key and refuses when it is missing. So the commit that declared the registry turned a silent fallback (no registry, base allow list) into a hard refusal for every implementer dispatch. Before landing a declaration that points at an existing file, dry-run the consumer that reads it (spawn-implementer --dry-run) so the schema mismatch shows up at the commit, not in the next run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
