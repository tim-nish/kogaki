<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1241 was admitted with files= naming checks/check-brief-reader-path-job.sh and a body line 'consult: none'; the implementer worker committed four green commits, then the registered suite refused the head on check-boundary-receipts (Check/CI boundary matched on the path, no receipt), ending the run suite-failed after ~9 minutes and $2.69 of work.

## The learning

Admission records a footprint and checks it against the served Rules, but nothing at admission compares that footprint with the repository's consultation map. An Issue whose files touch a mapped boundary, and whose body says no consult was made, will be built in full and only refused at the final suite run. The boundary match is knowable from files= alone at admission time, so that is where it should be raised, before any worker is paid for.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
