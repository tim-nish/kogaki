<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1350 removed the Persona sentence 'broken where the flow of the prose calls for it'. The plan retargeted check-draft-packet, which quotes a neighbouring phrase, but checks/check-brief-compose.sh case (o) also quotes the removed sentence verbatim. That file was not in the plan's file list, so the worker could not edit it and the cell was reaped suite-failed on brief-compose.

## The learning

When an Issue deletes or rewords text that checks quote verbatim, search the check root for every quoted fragment of the removed text, not just the headline phrase, and put every check file that quotes it into the plan's file list. A check listed only to be run cannot be fixed by the worker, so a missed quote shows up as a red suite after the work is done.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
