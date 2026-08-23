<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A required check read one of its inputs from the event payload that triggered the CI run. A repair was made to that input after the run, and re-running the same workflow run replayed the stored event, so the check kept failing against the pre-repair value while every live surface showed the repaired one.

## The learning

A CI re-run is a replay, not a refresh: it re-executes against the event payload captured when the run was first triggered, so any input read from the event -- a PR body, a title, labels -- is frozen at trigger time. Repairing such an input and pressing re-run tests the old value and reports the repair as absent. The fix is to mint a fresh event (a synchronize, a reopen, a new push) rather than re-running the old one; and a check that reads event-carried inputs should say so in its failure text, because 'the fix is there and CI cannot see it' looks identical to 'the fix is missing' from the operator's side.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
