<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1591 asked for one new case in checks/check-proof-sheet-leg-run.sh, which was already at exactly the 1,500-line limit; the case passed but put the file 23 lines over, and the limit's exemption list may only shrink.

## The learning

When a check file sits at its size limit, an Issue that adds a case to it has to say where the room comes from. Otherwise the person doing the work finds the gap only after the case passes, and the only fixes left are compaction nobody asked for, such as rewrapping comments or sharing a fixture with another case. Before filing such an Issue, look at the file's line count against the limit. If there is no room, have the Issue name a split or a new file and include it in the files the work may touch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
