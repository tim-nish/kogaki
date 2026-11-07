<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1570's Acceptance asked that checks/check-spec-structure.sh pass with the new FORMAT rule; no such file exists in the repository or its history, and admission stamped the Issue without remark.

## The learning

When an Issue's Acceptance names a check by path, confirm the file exists before admitting. If it does not, find the registered check whose covers list holds the file being changed (here check-proof-sheet-extract.sh covers passages/FORMAT.md) and put the new assertion there; then say in the pull request which check stood in for the missing one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
