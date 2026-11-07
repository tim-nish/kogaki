<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

Removing the item-count check for kogaki#1603 meant deleting a lookup function that was built in one file, threaded through a second file the Issue never named, and used only in a third; the plan's file list had to be widened twice, once for that pass-through file and once for the check registry whose prose described the removed case.

## The learning

When an Issue removes a check, size its file list from where the check's input is created and every place it is handed on, not only from where the check runs. A pass-through parameter and a registry sentence that describes the case are both part of the footprint, and finding them after the work starts costs a re-admission each.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
