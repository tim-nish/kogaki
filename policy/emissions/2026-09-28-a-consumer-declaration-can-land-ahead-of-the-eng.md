<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217: spawn-implementer refused 'checks/registry.json carries no tests list' although kogaki master (d81867f) already declares registry_list_key: checks in .claude/checks.json

## The learning

The reader for that declaration (claude-toolkit#1289) merged to claude-toolkit's develop branch, not main, so the installed engine under ~/.claude/tools never learned the key and refuses exactly as before. A consumer-side declaration that fixes a refusal is only live once the engine change it depends on is on the branch that gets installed; check the installed copy for the new key before dispatching, not the consumer repo.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
