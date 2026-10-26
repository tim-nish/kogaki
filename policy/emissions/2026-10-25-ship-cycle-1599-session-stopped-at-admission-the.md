<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1599 --session stopped at admission: the Issue's only file is .claude/policy-check.json

## The learning

Electing an Issue for the session does not get it past admission when its files sit under .claude/: the verdict's worker-unwritable check runs on every plan cell without asking who will carry it, and a cell with no files is refused for having no footprint. So a session-only edit to a .claude/ declaration cannot be admitted at all until that check skips the cells a session election names.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
