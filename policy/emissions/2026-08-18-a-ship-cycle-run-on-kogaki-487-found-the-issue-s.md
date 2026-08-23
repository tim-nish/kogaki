<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run on kogaki#487 found the issue's remedy already satisfied in merged master by a different issue's re-cut, while the triage ledger still read 'awaiting /implement-direct' and the issue's own pull request sat closed-unmerged. Dispatching the named lane would have re-implemented work already shipped.

## The learning

A closed-unmerged pull request sitting against a still-open issue is a supersession tell, and it is the cheapest one available — it says the work was attempted and abandoned, which happens when something else discharged it, far more often than it says the work failed. The queue cannot tell the two apart: a classification records what a lane WAS going to do and never re-asks whether the doing is still owed, so an issue superseded by a neighbour's re-cut reads identically to an issue nobody got to. Check the acceptance criteria against merged HEAD before dispatching any lane at an issue whose own PR closed without merging, and name the successors in the close rather than the lane that never ran; the successor names are what let the next reader tell a discharge from an abandonment.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
