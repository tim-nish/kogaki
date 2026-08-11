<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A CI check refused a pull request for a missing record. The record was added to the request's description, the failed job was re-run, and it refused again for the same reason — while a second input the same check reads was picking up edits fine.

## The learning

When an automated job reads something about the work under review, find out whether it was handed that thing at the moment the job was triggered or whether the job goes and fetches it while running. A value handed over at trigger time is frozen: re-running the job replays the same frozen copy, so any edit made afterwards is invisible no matter how many times you retry. A value the job fetches itself sees the edit immediately. The two look identical from outside — same check, same failure message, same retry button — which is why the retry gets repeated rather than questioned. It is worth knowing before you edit, because the fix differs entirely: a fetched input needs only the edit, while a frozen one needs a whole new trigger, and the cheapest trigger available may or may not preserve the properties other machinery is depending on. Here, reopening the request produced a fresh trigger while leaving the code revision untouched, which mattered because a completed review was bound to that revision and would have been discarded by any route that changed it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
